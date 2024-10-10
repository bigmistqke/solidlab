import { isSingleLine } from './is-single-line'

export function composeComment(comment: string, indentation: string) {
  const lines = comment.split('\n')
  if (isSingleLine(comment)) {
    return `/** ${lines[0]} */`
  }
  return `/** 
${comment
  .split('\n')
  .map((line) => `${indentation} * ${line}`)
  .join('\n')}
${indentation} */`
}
