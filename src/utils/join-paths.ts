export function joinPaths(absolutePath: string, relativePath: string): string {
  const absoluteUrl = new URL(absolutePath)
  const combinedUrl = new URL(relativePath, absoluteUrl)
  return combinedUrl.href
}
