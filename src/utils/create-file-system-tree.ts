import { FileSystemTree } from '@webcontainer/api'

export function createFileSystemTree(flatFileSystem: [string, string][]): FileSystemTree {
  const root: FileSystemTree = {}

  for (const [filePath, content] of flatFileSystem) {
    const parts = filePath.split('/') // Removing './bare' prefix
    let current: FileSystemTree = root

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1

      if (isFile) {
        current[part] = {
          file: {
            contents: content,
          },
        }
      } else {
        current[part] = current[part] || { directory: {} }
        current = (current[part] as { directory: FileSystemTree }).directory
      }
    })
  }

  return root
}
