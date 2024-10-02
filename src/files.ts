import { createFileSystemTree } from './utils/create-file-system-tree'

export const files = createFileSystemTree(
  await Promise.all(
    Object.entries(import.meta.glob('./bare/**/*', { as: 'raw' })).map(
      async ([key, fn]) => [key.split('/').slice(2).join('/'), await fn()] as const,
    ),
  ),
)
