import { escapeRegex } from './escape-regex'

export type RegexConfig = {
  isRegex?: boolean
  isWholeWord?: boolean
  isCaseSensitive?: boolean
  isSingleMatch?: boolean
}

export function composeRegex(
  query: string,
  { isRegex, isWholeWord, isCaseSensitive, isSingleMatch } = {} as RegexConfig,
) {
  let string = isRegex ? query : escapeRegex(query)

  if (isWholeWord) {
    string = `\\b${string}\\b`
  }

  return isSingleMatch
    ? new RegExp(string, isCaseSensitive ? 'i' : 'i')
    : new RegExp(string, `g${isCaseSensitive ? '' : 'i'}`)
}
