import json
import time
import sys
import os
import math
import base64

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
            if count > 1:
                compressed.append([current_val, count])
            else:
                compressed.append(current_val)
            current_val = data[i]
            count = 1
            
    if count > 1:
        compressed.append([current_val, count])
    else:
        compressed.append(current_val)
        
    return compressed

def sparse_compress(data):
    compressed = []
    for idx, val in enumerate(data):
        if val != 0:
            compressed.append(idx)
            compressed.append(val)
    return compressed

def delta_compress(data, precision=2):
    """Store first value + deltas. Deltas are computed from the reconstructed value
    so rounding errors don't accumulate."""
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
    """Delta encode first, then RLE the deltas."""
    deltas = delta_compress(data, precision)
    return rle_compress(deltas)

def quantized_delta_rle_compress(data, precision=1):
    """Delta encode with aggressive rounding, then RLE."""
    deltas = delta_compress(data, precision)
    return rle_compress(deltas)

def dictionary_compress(data):
    """Map unique values to short integer keys. Returns {keys: [...], values: [...]}."""
    unique_vals = sorted(set(data))
    val_to_key = {v: i for i, v in enumerate(unique_vals)}
    encoded = [val_to_key[v] for v in data]
    return {"values": unique_vals, "keys": encoded}

def dictionary_rle_compress(data):
    """Dictionary encode, then RLE the keys array."""
    unique_vals = sorted(set(data))
    val_to_key = {v: i for i, v in enumerate(unique_vals)}
    encoded = [val_to_key[v] for v in data]
    return {"values": unique_vals, "keys": rle_compress(encoded)}

def bitpack_compress(data):
    """Dictionary-encode values, then bitpack the key indices into a base64 string.
    Each key uses the minimum number of bits needed to represent all unique values.
    Result: {values: [...], bits: N, data: "base64string"}"""
    unique_vals = sorted(set(data))
    val_to_key = {v: i for i, v in enumerate(unique_vals)}
    n_unique = len(unique_vals)
    bits_per_key = max(1, math.ceil(math.log2(n_unique))) if n_unique > 1 else 1

    # Pack keys into a byte array
    buf = bytearray()
    current_byte = 0
    bits_filled = 0
    for v in data:
        key = val_to_key[v]
        # Write bits_per_key bits of key into the buffer, MSB first
        for bit_pos in range(bits_per_key - 1, -1, -1):
            bit = (key >> bit_pos) & 1
            current_byte = (current_byte << 1) | bit
            bits_filled += 1
            if bits_filled == 8:
                buf.append(current_byte)
                current_byte = 0
                bits_filled = 0
    # Flush remaining bits
    if bits_filled > 0:
        current_byte <<= (8 - bits_filled)
        buf.append(current_byte)

    encoded = base64.b64encode(bytes(buf)).decode('ascii')
    return {"values": unique_vals, "bits": bits_per_key, "count": len(data), "data": encoded}


def delta_bitpack_compress(data, precision=2):
    """Delta encode, then bitpack the deltas."""
    deltas = delta_compress(data, precision)
    return bitpack_compress(deltas)


def benchmark_file(filename):
    if not os.path.exists(filename):
        print(f"File {filename} not found. Skipping.")
        return

    print(f"\n--- Benchmarking {filename} ---")
    with open(filename, 'r') as f:
        data = json.load(f)
    
    points = data.get("points", [])
    if not points:
        print(f"No 'points' field found in {filename}. Skipping.")
        return

    print(f"Total points: {len(points)}")
    
    original_json = json.dumps(points)
    original_size = len(original_json.encode('utf-8'))
    print(f"Original JSON size: {original_size / 1024:.2f} KB")

    # RLE
    start_time = time.perf_counter()
    rle_data = rle_compress(points)
    rle_time = time.perf_counter() - start_time
    rle_json = json.dumps(rle_data)
    rle_size = len(rle_json.encode('utf-8'))

    # Sparse
    start_time = time.perf_counter()
    sparse_data = sparse_compress(points)
    sparse_time = time.perf_counter() - start_time
    sparse_json = json.dumps(sparse_data)
    sparse_size = len(sparse_json.encode('utf-8'))

    # Delta
    start_time = time.perf_counter()
    delta_data = delta_compress(points)
    delta_time = time.perf_counter() - start_time
    delta_json = json.dumps(delta_data)
    delta_size = len(delta_json.encode('utf-8'))

    # Delta + RLE
    start_time = time.perf_counter()
    delta_rle_data = delta_rle_compress(points)
    delta_rle_time = time.perf_counter() - start_time
    delta_rle_json = json.dumps(delta_rle_data)
    delta_rle_size = len(delta_rle_json.encode('utf-8'))

    # Quantized Delta + RLE (1 decimal precision)
    start_time = time.perf_counter()
    qdelta_rle_data = quantized_delta_rle_compress(points, precision=1)
    qdelta_rle_time = time.perf_counter() - start_time
    qdelta_rle_json = json.dumps(qdelta_rle_data)
    qdelta_rle_size = len(qdelta_rle_json.encode('utf-8'))

    # Quantized Delta + RLE max error
    reconstructed = [points[0]]
    deltas_q = delta_compress(points, precision=1)
    for i in range(1, len(deltas_q)):
        reconstructed.append(round(reconstructed[-1] + deltas_q[i], 2))
    max_err = max(abs(a - b) for a, b in zip(points, reconstructed))

    # Dictionary
    start_time = time.perf_counter()
    dict_data = dictionary_compress(points)
    dict_time = time.perf_counter() - start_time
    dict_json = json.dumps(dict_data)
    dict_size = len(dict_json.encode('utf-8'))

    # Dictionary + RLE
    start_time = time.perf_counter()
    dict_rle_data = dictionary_rle_compress(points)
    dict_rle_time = time.perf_counter() - start_time
    dict_rle_json = json.dumps(dict_rle_data)
    dict_rle_size = len(dict_rle_json.encode('utf-8'))

    # Bitpack
    start_time = time.perf_counter()
    bitpack_data = bitpack_compress(points)
    bitpack_time = time.perf_counter() - start_time
    bitpack_json = json.dumps(bitpack_data)
    bitpack_size = len(bitpack_json.encode('utf-8'))

    # Delta + Bitpack
    start_time = time.perf_counter()
    delta_bitpack_data = delta_bitpack_compress(points)
    delta_bitpack_time = time.perf_counter() - start_time
    delta_bitpack_json = json.dumps(delta_bitpack_data)
    delta_bitpack_size = len(delta_bitpack_json.encode('utf-8'))

    n_unique = len(set(points))
    bits_per_key = max(1, math.ceil(math.log2(n_unique))) if n_unique > 1 else 1
    n_unique_deltas = len(set(delta_compress(points)))
    bits_per_delta = max(1, math.ceil(math.log2(n_unique_deltas))) if n_unique_deltas > 1 else 1

    print(f"Unique values: {n_unique} ({bits_per_key} bits), Unique deltas: {n_unique_deltas} ({bits_per_delta} bits)")
    print(f"RLE:              Size = {rle_size / 1024:7.2f} KB, Time = {rle_time:.6f}s, Ratio = {rle_size/original_size:.2%}")
    print(f"Sparse:           Size = {sparse_size / 1024:7.2f} KB, Time = {sparse_time:.6f}s, Ratio = {sparse_size/original_size:.2%}")
    print(f"Delta:            Size = {delta_size / 1024:7.2f} KB, Time = {delta_time:.6f}s, Ratio = {delta_size/original_size:.2%}")
    print(f"Delta+RLE:        Size = {delta_rle_size / 1024:7.2f} KB, Time = {delta_rle_time:.6f}s, Ratio = {delta_rle_size/original_size:.2%}")
    print(f"QDelta+RLE(1dp):  Size = {qdelta_rle_size / 1024:7.2f} KB, Time = {qdelta_rle_time:.6f}s, Ratio = {qdelta_rle_size/original_size:.2%}, MaxErr = {max_err:.4f}")
    print(f"Dict:             Size = {dict_size / 1024:7.2f} KB, Time = {dict_time:.6f}s, Ratio = {dict_size/original_size:.2%}")
    print(f"Dict+RLE:         Size = {dict_rle_size / 1024:7.2f} KB, Time = {dict_rle_time:.6f}s, Ratio = {dict_rle_size/original_size:.2%}")
    print(f"Bitpack:          Size = {bitpack_size / 1024:7.2f} KB, Time = {bitpack_time:.6f}s, Ratio = {bitpack_size/original_size:.2%}")
    print(f"Delta+Bitpack:    Size = {delta_bitpack_size / 1024:7.2f} KB, Time = {delta_bitpack_time:.6f}s, Ratio = {delta_bitpack_size/original_size:.2%}")

def main():
    files = ["aurora.json", "drap.json", "geoelectric.json"]
    for f in files:
        benchmark_file(f)

if __name__ == "__main__":
    main()
