/**
 * Decode a delta-bitpack compressed payload back to a flat numeric array.
 *
 * Payload shape: { values: number[], bits: number, count: number, data: string }
 *   - values : sorted lookup table of unique delta values
 *   - bits   : number of bits used per symbol
 *   - count  : total number of elements in the original array
 *   - data   : base64-encoded bitstream
 *
 * @param {{ values: number[], bits: number, count: number, data: string }} payload
 * @returns {number[]} Reconstructed flat numeric array
 */
export function decodeDeltaBitpack(payload) {
  const { values, bits, count, data } = payload;
  if (count === 0) return [];

  // Decode base64 → Uint8Array
  const binaryStr = atob(data);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  // Unpack bit-packed keys → delta lookup values
  const result = new Array(count);
  let byteIdx = 0;
  let bitIdx = 0;

  // First element: read key, look up the initial value
  let key = 0;
  for (let b = 0; b < bits; b++) {
    key = (key << 1) | ((bytes[byteIdx] >> (7 - bitIdx)) & 1);
    bitIdx++;
    if (bitIdx === 8) { bitIdx = 0; byteIdx++; }
  }
  result[0] = values[key];

  // Remaining elements: read key, look up delta, accumulate
  for (let i = 1; i < count; i++) {
    key = 0;
    for (let b = 0; b < bits; b++) {
      key = (key << 1) | ((bytes[byteIdx] >> (7 - bitIdx)) & 1);
      bitIdx++;
      if (bitIdx === 8) { bitIdx = 0; byteIdx++; }
    }
    result[i] = Math.round((result[i - 1] + values[key]) * 100) / 100;
  }

  return result;
}

/**
 * Merge a decoded flat values array with a coordinates array to produce
 * the [[lat, lon, value], ...] format the visualization layer expects.
 *
 * @param {number[][]} coordinates  Array of [lat, lon] pairs
 * @param {number[]}   values       Flat array of decoded values
 * @returns {number[][]} Array of [lat, lon, value] triples
 */
export function mergeCoordinatesAndValues(coordinates, values) {
  const len = Math.min(coordinates.length, values.length);
  const result = new Array(len);
  for (let i = 0; i < len; i++) {
    result[i] = [...coordinates[i], values[i]];
  }
  return result;
}
