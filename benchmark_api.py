"""
Benchmark V1 vs V2 API endpoints for query time and transfer size.

Compares:
  - /latest endpoints: V2 uncompressed vs V2 delta-bitpack compressed
  - /kermit playback: V1 (full [lat,lon,val] triples) vs V2 (flat values)

Usage:
    python benchmark_api.py [--api-url http://localhost:8000]
                            [--start 2026-04-08T00:00:00Z]
                            [--end   2026-04-08T02:00:00Z]
                            [--interval 5]
"""

import json
import time
import argparse
import urllib.request


def fetch(url):
    """Return (body_bytes, elapsed_seconds)."""
    t0 = time.perf_counter()
    with urllib.request.urlopen(url) as r:
        body = r.read()
    return body, time.perf_counter() - t0


def fmt_kb(n):
    return f"{n / 1024:,.1f} KB"


def benchmark_latest(api_url, events):
    print("=" * 72)
    print("  Latest Endpoint (single snapshot from Redis cache)")
    print("=" * 72)
    print(f"{'Event':<14} {'Encoding':<18} {'Size':>10} {'Time':>8} {'Saved':>7}")
    print("-" * 62)

    for event in events:
        unc_body, unc_t = fetch(f"{api_url}/api/v2/{event}/latest")
        comp_body, comp_t = fetch(f"{api_url}/api/v2/{event}/latest?encoding=delta-bitpack")
        unc_sz = len(unc_body)
        comp_sz = len(comp_body)
        pct = (1 - comp_sz / unc_sz) * 100 if unc_sz else 0

        print(f"{event:<14} {'uncompressed':<18} {fmt_kb(unc_sz):>10} {unc_t:>7.3f}s")
        print(f"{'':<14} {'delta-bitpack':<18} {fmt_kb(comp_sz):>10} {comp_t:>7.3f}s {pct:>5.1f}%")
    print()


def benchmark_kermit(api_url, events, start, end, interval):
    print("=" * 72)
    print(f"  Playback Endpoint (kermit, {start} to {end}, {interval}m)")
    print("=" * 72)
    print(f"{'Event':<14} {'Version':<6} {'Size':>12} {'Time':>8} {'Snaps':>6} {'Saved':>7}")
    print("-" * 62)

    qs = f"start={start}&end={end}&interval={interval}"

    for event in events:
        results = {}
        for ver, path in [("V1", f"/api/v1/kermit?event={event}&{qs}"),
                          ("V2", f"/api/v2/kermit?event={event}&{qs}")]:
            try:
                body, elapsed = fetch(f"{api_url}{path}")
                data = json.loads(body)
                snaps = len(data)
                results[ver] = (len(body), elapsed, snaps)
                print(f"{event:<14} {ver:<6} {fmt_kb(len(body)):>12} {elapsed:>7.3f}s {snaps:>6}")
            except Exception as e:
                print(f"{event:<14} {ver:<6} {'ERROR':>12} {'':<8} {str(e)[:30]}")

        if "V1" in results and "V2" in results:
            v1_sz = results["V1"][0]
            v2_sz = results["V2"][0]
            pct = (1 - v2_sz / v1_sz) * 100 if v1_sz else 0
            v1_t = results["V1"][1]
            v2_t = results["V2"][1]
            print(f"  --> size: -{pct:.1f}%  |  query: {v1_t:.3f}s -> {v2_t:.3f}s")
        print()


def main():
    parser = argparse.ArgumentParser(description="Benchmark V1 vs V2 API transfer size and query time")
    parser.add_argument("--api-url", default="http://localhost:8000", help="Base API URL")
    parser.add_argument("--start", default="2026-04-08T00:00:00Z", help="Playback start (ISO 8601)")
    parser.add_argument("--end", default="2026-04-08T06:00:00Z", help="Playback end (ISO 8601)")
    parser.add_argument("--interval", type=int, default=5, help="Playback interval in minutes")
    args = parser.parse_args()

    events = ["drap", "aurora", "geoelectric"]
    print(f"\nAPI: {args.api_url}\n")

    benchmark_latest(args.api_url, events)
    benchmark_kermit(args.api_url, events, args.start, args.end, args.interval)


if __name__ == "__main__":
    main()
