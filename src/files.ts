import { createFileSystemTree } from './utils/create-file-system-tree'

export const files = createFileSystemTree(
  await Promise.all(
    Object.entries(import.meta.glob(`./examples/basic/**/*`, { as: 'raw' })).map(
      async ([key, fn]) => [key.split('/').slice(3).join('/'), await fn()] as const,
    ),
  ),
)
