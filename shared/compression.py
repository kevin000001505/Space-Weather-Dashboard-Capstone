"""Delta-bitpack compression for space weather grid data.

Encodes a flat list of numeric values by:
1. Delta-encoding (differences between consecutive values) to reduce the
   number of unique symbols.
2. Bitpacking the symbol indices into a base64 string using the minimum
   number of bits per symbol.

The result is a compact JSON-serialisable dict that can be decoded on the
frontend with ~20 lines of JavaScript.
"""

import math
import base64
from typing import List


def delta_bitpack_compress(data: List[float], precision: int = 2) -> dict:
    """Compress a flat numeric list using delta-encoding + bitpacking.

    Returns ``{"values": [...], "bits": int, "count": int, "data": str}``.
    """
    if not data:
        return {"values": [], "bits": 0, "count": 0, "data": ""}

    # Delta-encode from the *reconstructed* value so rounding errors
    # don't accumulate across the whole array.
    deltas = [data[0]]
    prev = data[0]
    for i in range(1, len(data)):
        delta = round(data[i] - prev, precision)
        deltas.append(delta)
        prev = round(prev + delta, precision)

    # Build a lookup table of unique delta values → integer keys.
    unique_vals = sorted(set(deltas))
    val_to_key = {v: i for i, v in enumerate(unique_vals)}
    n_unique = len(unique_vals)
    bits_per_key = max(1, math.ceil(math.log2(n_unique))) if n_unique > 1 else 1

    # Pack keys into a byte buffer, MSB-first.
    buf = bytearray()
    current_byte = 0
    bits_filled = 0
    for v in deltas:
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


def delta_bitpack_decompress(payload: dict) -> List[float]:
    """Decompress a delta-bitpack payload back to the original flat list."""
    values = payload["values"]
    bits = payload["bits"]
    count = payload["count"]
    data_b64 = payload["data"]

    if count == 0:
        return []

    raw = base64.b64decode(data_b64)
    byte_idx = 0
    bit_idx = 0
    deltas = []
    for _ in range(count):
        key = 0
        for _ in range(bits):
            key = (key << 1) | ((raw[byte_idx] >> (7 - bit_idx)) & 1)
            bit_idx += 1
            if bit_idx == 8:
                bit_idx = 0
                byte_idx += 1
        deltas.append(values[key])

    result = [deltas[0]]
    for i in range(1, count):
        result.append(round(result[-1] + deltas[i], 2))
    return result
