import { FileSystemTree } from '@webcontainer/api'

// src
import app from './bare/src/app?raw'
import entryClient from './bare/src/entry-client?raw'
import entryServer from './bare/src/entry-server?raw'
import global from './bare/src/global.d.ts?raw'

import appConfig from './bare/app.config?raw'
import packageJson from './bare/package.json?raw'
import tsConfig from './bare/tsconfig.json?raw'

export const files: FileSystemTree = {
  src: {
    directory: {
      'app.tsx': {
        file: {
          contents: app,
        },
      },
      'entry-client.tsx': {
        file: {
          contents: entryClient,
        },
      },
      'entry-server.tsx': {
        file: {
          contents: entryServer,
        },
      },
      'global.d.ts': {
        file: {
          contents: global,
        },
      },
    },
  },
  'app.config.ts': {
    file: {
      contents: appConfig,
    },
  },
  'package.json': {
    file: {
      contents: packageJson,
    },
  },
  'tsconfig.json': {
    file: {
      contents: tsConfig,
    },
  },
}
