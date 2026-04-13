"""Re-export from shared module for backward compatibility."""

from shared.compression import delta_bitpack_compress, delta_bitpack_decompress

__all__ = ["delta_bitpack_compress", "delta_bitpack_decompress"]
