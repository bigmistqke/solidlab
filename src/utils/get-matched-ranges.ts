/**
 * Finds all occurrences of a given regular expression in a string and returns their ranges.
 *
 * @param inputString - The string in which to search for the regular expression.
 * @param regex - The regular expression to match against the input string.
 * @returns An array of tuples, where each tuple contains the start and end indices of a match.
 *
 * @example
 * const input = "The quick brown fox jumps over the lazy dog";
 * const regex = /o/g;
 * const ranges = getMatchedRanges(input, regex);
 * // ranges will be: [[12, 13], [17, 18], [43, 44]]
 */
export function getMatchedRanges(inputString: string, regex: RegExp) {
  if (!inputString) {
    console.error('inputString is undefined')
    return []
  }
  const matches = inputString.matchAll(regex)
  const ranges: Array<{ start: number; end: number }> = []

  for (const match of matches) {
    if (match.index !== undefined) {
      ranges.push({ start: match.index, end: match.index + match[0].length })
    }
  }

  return ranges
}
