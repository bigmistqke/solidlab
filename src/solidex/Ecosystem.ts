// Taken from https://raw.githubusercontent.com/solidjs/solid-site/refs/heads/main/src/pages/Resources/Ecosystem.ts
// NOTE: maybe this data should be hosted somewhere as a separate package, so we can import it?

// import { bookOpen, code, microphone, terminal, videoCamera } from 'solid-heroicons/outline'

export enum ResourceType {
  Article = 'article',
  Video = 'video',
  Podcast = 'podcast',
}
export enum PackageType {
  Library = 'library',
  Package = 'package',
}
export enum ResourceCategory {
  Primitives = 'primitive',
  Routers = 'router',
  Data = 'data',
  DataVisualization = 'data_visualization',
  UI = 'ui',
  Plugins = 'plugin',
  Starters = 'starters',
  BuildUtilities = 'build_utility',
  AddOn = 'add_on',
  Testing = 'testing',
  Educational = 'educational',
}
export const ResourceCategoryName = Object.fromEntries(
  Object.entries(ResourceCategory).map(([key, value]) => [value, key]),
) as Record<ResourceCategory, string>
export interface Resource {
  title: string
  link: string
  author?: string
  author_url?: string
  description?: string
  type: ResourceType | PackageType
  categories: readonly ResourceCategory[]
  official?: boolean // If the resource is an official Solid resource
  maintained?: boolean // If the resource is maintained and can be used
  keywords?: readonly string[]
  published_at?: number
  package?: string | string[]
}

export const ResourceTypeIcons = {
  article: 'bookOpen',
  podcast: 'microphone',
  video: 'videoCamera',
  library: 'code',
  package: 'terminal',
}
