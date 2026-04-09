"""
Benchmark compression methods for space weather grid data.

Fetches live data from the V2 API (uncompressed flat values) and tests
various compression strategies to measure size reduction and encode time.

Usage:
    python benchmark_compression.py [--api-url http://localhost:8000]
"""

import json
import time
import math
import base64
import argparse
import urllib.request


# ---------------------------------------------------------------------------
# Compression methods
# ---------------------------------------------------------------------------

def rle_compress(data):
    if not data:
        return []
    compressed = []
    current_val = data[0]
    count = 1
    for i in range(1, len(data)):
        if data[i] == current_val:
            count += 1
        else:
            compressed.append([current_val, count] if count > 1 else current_val)
            current_val = data[i]
            count = 1
    compressed.append([current_val, count] if count > 1 else current_val)
    return compressed


def sparse_compress(data):
    compressed = []
    for idx, val in enumerate(data):
        if val != 0:
            compressed.extend([idx, val])
    return compressed


def delta_compress(data, precision=2):
    """Deltas computed from reconstructed value to prevent error accumulation."""
    if not data:
        return []
    compressed = [data[0]]
    prev = data[0]
    for i in range(1, len(data)):
        delta = round(data[i] - prev, precision)
        compressed.append(delta)
        prev = round(prev + delta, precision)
    return compressed


def delta_rle_compress(data, precision=2):
    return rle_compress(delta_compress(data, precision))


def quantized_delta_rle_compress(data, precision=1):
    return rle_compress(delta_compress(data, precision))


def dictionary_compress(data):
    unique_vals = sorted(set(data))
    val_to_key = {v: i for i, v in enumerate(unique_vals)}
    return {"values": unique_vals, "keys": [val_to_key[v] for v in data]}


def dictionary_rle_compress(data):
    unique_vals = sorted(set(data))
    val_to_key = {v: i for i, v in enumerate(unique_vals)}
    return {"values": unique_vals, "keys": rle_compress([val_to_key[v] for v in data])}


def bitpack_compress(data):
    unique_vals = sorted(set(data))
    val_to_key = {v: i for i, v in enumerate(unique_vals)}
    n_unique = len(unique_vals)
    bits_per_key = max(1, math.ceil(math.log2(n_unique))) if n_unique > 1 else 1

    buf = bytearray()
    current_byte = 0
    bits_filled = 0
    for v in data:
        key = val_to_key[v]
        for bit_pos in range(bits_per_key - 1, -1, -1):
            current_byte = (current_byte << 1) | ((key >> bit_pos) & 1)
            bits_filled += 1
            if bits_filled == 8:
                buf.append(current_byte)
                current_byte = 0
                bits_filled = 0
    if bits_filled > 0:
        current_byte <<= 8 - bits_filled
        buf.append(current_byte)

    return {
        "values": unique_vals,
        "bits": bits_per_key,
        "count": len(data),
        "data": base64.b64encode(bytes(buf)).decode("ascii"),
    }


def delta_bitpack_compress(data, precision=2):
    return bitpack_compress(delta_compress(data, precision))


# ---------------------------------------------------------------------------
# Benchmark helpers
# ---------------------------------------------------------------------------

def json_size(obj):
    return len(json.dumps(obj).encode("utf-8"))


def fetch_points(api_url, event):
    """Fetch uncompressed flat values from the V2 latest endpoint."""
    url = f"{api_url}/api/v2/{event}/latest"
    with urllib.request.urlopen(url) as r:
        data = json.loads(r.read())
    return data["points"]


def benchmark_event(api_url, event):
    print(f"\n{'=' * 70}")
    print(f"  {event.upper()}")
    print(f"{'=' * 70}")

    points = fetch_points(api_url, event)
    print(f"Points: {len(points):,}")

    original_size = json_size(points)
    print(f"Original JSON: {original_size / 1024:.1f} KB")

    n_unique = len(set(points))
    bits_direct = max(1, math.ceil(math.log2(n_unique))) if n_unique > 1 else 1
    deltas = delta_compress(points)
    n_unique_deltas = len(set(deltas))
    bits_delta = max(1, math.ceil(math.log2(n_unique_deltas))) if n_unique_deltas > 1 else 1
    print(f"Unique values: {n_unique} ({bits_direct}b)  |  Unique deltas: {n_unique_deltas} ({bits_delta}b)")

    methods = [
        ("RLE",              lambda p: rle_compress(p)),
        ("Sparse",           lambda p: sparse_compress(p)),
        ("Delta",            lambda p: delta_compress(p)),
        ("Delta+RLE",        lambda p: delta_rle_compress(p)),
        ("QDelta+RLE (1dp)", lambda p: quantized_delta_rle_compress(p, precision=1)),
        ("Dict",             lambda p: dictionary_compress(p)),
        ("Dict+RLE",         lambda p: dictionary_rle_compress(p)),
        ("Bitpack",          lambda p: bitpack_compress(p)),
        ("Delta+Bitpack",    lambda p: delta_bitpack_compress(p)),
    ]

    print(f"\n{'Method':<20} {'Size':>9} {'Ratio':>7} {'Encode':>10}")
    print("-" * 50)
    for name, fn in methods:
        t0 = time.perf_counter()
        result = fn(points)
        elapsed = time.perf_counter() - t0
        size = json_size(result)
        ratio = size / original_size
        print(f"{name:<20} {size/1024:>8.1f}K {ratio:>6.1%} {elapsed:>9.4f}s")

    # QDelta max error
    reconstructed = [points[0]]
    deltas_q = delta_compress(points, precision=1)
    for i in range(1, len(deltas_q)):
        reconstructed.append(round(reconstructed[-1] + deltas_q[i], 2))
    max_err = max(abs(a - b) for a, b in zip(points, reconstructed))
    print(f"\nQDelta(1dp) max reconstruction error: {max_err:.4f}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Benchmark compression methods for space weather data")
    parser.add_argument("--api-url", default="http://localhost:8000", help="Base API URL")
    args = parser.parse_args()

    print(f"Fetching data from {args.api_url}")
    for event in ["drap", "aurora", "geoelectric"]:
        benchmark_event(args.api_url, event)
    print()


if __name__ == "__main__":
    main()
