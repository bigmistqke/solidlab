export function spliceString(str: string, start: number, deleteCount: number, insert: string = ''): string {
  // Ensure the start index is within the bounds of the string
  if (start < 0) {
    start = str.length + start
    if (start < 0) start = 0
  } else if (start > str.length) {
    start = str.length
  }

  // Handle deleteCount
  if (deleteCount < 0) deleteCount = 0

  // Perform the splice operation
  const firstPart = str.slice(0, start)
  const secondPart = str.slice(start + deleteCount)

  return firstPart + insert + secondPart
}
