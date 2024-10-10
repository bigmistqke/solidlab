import loader, { Monaco as MonacoType } from '@monaco-editor/loader'
import { WebContainer } from '@webcontainer/api'
import githubLight from 'monaco-themes/themes/GitHub Light.json'
import nightOwl from 'monaco-themes/themes/Night Owl.json'
import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  onMount,
  splitProps,
} from 'solid-js'
import { useSolidLab } from '../solidlab'
import { capitalize } from '../utils/capitalize'
import { every, when, whenEffect } from '../utils/conditionals'
import styles from './Monaco.module.css'

type MonacoCompilerOptions = Parameters<
  Awaited<
    ReturnType<(typeof loader)['init']>
  >['languages']['typescript']['typescriptDefaults']['setCompilerOptions']
>[0]

export function Monaco() {
  const repl = useSolidLab()

  const [element, setElement] = createSignal<HTMLDivElement>()
  const [monaco] = createResource(() => loader.init())

  const editor = createMemo(
    when(every(monaco, element), ([monaco, element]) =>
      monaco.editor.create(element, {
        value: '',
        language: 'typescript',
        automaticLayout: true,
        fixedOverflowWidgets: true,
      }),
    ),
  )

  whenEffect(every(repl.webContainer, monaco, editor), async ([container, monaco, editor]) => {
    createEffect(() => {
      if (repl.colorMode() === 'dark') {
        nightOwl.colors['editor.background'] = '#00000000'
        monaco.editor.defineTheme('nightOwl', nightOwl)
        monaco.editor.setTheme('nightOwl')
      } else {
        githubLight.colors['editor.background'] = '#00000000'
        monaco.editor.defineTheme('githubLight', githubLight)
        monaco.editor.setTheme('githubLight')
      }
    })

    // Set currently focused tab
    {
      createEffect(async () => {
        const path = repl.activeTab()
        if (path) {
          const uri = monaco.Uri.parse(`file://${path}`)

          const model =
            monaco.editor.getModel(uri) ||
            monaco.editor.createModel(await container.fs.readFile(path, 'utf-8'), undefined, uri)

          editor.setModel(model)
        }
      })
    }

    // Handle local files
    watchLocalFiles(container, monaco)

    // Handle types of external packages
    watchExternalPackages(container, monaco)
  })

  return <div ref={setElement} class={styles.monaco} />
}

function watchCompilerOptions(container: WebContainer, monaco: MonacoType) {
  async function updateCompilerOptions() {
    const userTsConfig = JSON.parse(await container.fs.readFile('./tsconfig.json', 'utf-8')) as {
      compilerOptions: Record<string, string> & { paths: Record<string, string[]> }
    }

    const [specialOptions, rest] = splitProps(userTsConfig.compilerOptions, [
      'target',
      'jsx',
      'module',
      'moduleResolution',
      'paths',
    ])

    const paths = specialOptions.paths
      ? Object.fromEntries(
          Object.entries(specialOptions.paths).map(([key, paths]) => [
            key,
            paths.map(path => path.replace('./', 'file:///')),
          ]),
        )
      : undefined

    const { ScriptTarget, JsxEmit, ModuleKind, ModuleResolutionKind } = monaco.languages.typescript

    const tsconfig: MonacoCompilerOptions = {
      target: ScriptTarget[capitalize(specialOptions.target) as keyof typeof ScriptTarget],
      jsx: JsxEmit[capitalize(specialOptions.jsx) as keyof typeof JsxEmit],
      module: ModuleKind[capitalize(specialOptions.module) as keyof typeof ModuleKind],
      moduleResolution:
        ModuleResolutionKind[
          capitalize(specialOptions.moduleResolution) as keyof typeof ModuleResolutionKind
        ] || ModuleResolutionKind.NodeJs,
      paths,
      ...rest,
    }

    console.log({ tsconfig })

    monaco.languages.typescript.javascriptDefaults.setCompilerOptions(tsconfig)
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions(tsconfig)
  }
  container.fs.watch('tsconfig.json', updateCompilerOptions)
  updateCompilerOptions()
}

function watchExternalPackages(container: WebContainer, monaco: MonacoType) {
  const repl = useSolidLab()
  const installedPackages = new Set<string>()
  const pendingPackages = new Set<string>()

  // Fetch .d.ts and package.json from virtual filesystem
  async function fetchDeclarationFiles(packageName: string) {
    let declarationFiles: [string, string][] = []

    async function iterate(parentPath: string) {
      try {
        const dirContents = await container.fs.readdir(parentPath, { withFileTypes: true })
        for (const dirContent of dirContents) {
          if (dirContent.isDirectory()) {
            await iterate(`${parentPath}/${dirContent.name}`)
          } else {
            if (dirContent.name.endsWith('.d.ts') || dirContent.name === 'package.json') {
              const path = `${parentPath}/${dirContent.name}`
              declarationFiles.push([
                path.replace('./', ''),
                await container.fs.readFile(path, 'utf-8'),
              ])
            }
          }
        }
      } catch (error) {
        console.error(error)
      }
    }
    await iterate(`node_modules/${packageName}`)

    return declarationFiles
  }

  whenEffect(repl.progress.packagesInstalled, async () => {
    const libraries = await Promise.all(
      Array.from(pendingPackages).map(library => fetchDeclarationFiles(library)),
    )

    for (const library of libraries) {
      if (!library) {
        continue
      }
      for (const [path, source] of library) {
        monaco.languages.typescript.typescriptDefaults.addExtraLib(source, `file:///${path}`)
        monaco.languages.typescript.javascriptDefaults.addExtraLib(source, `file:///${path}`)
      }
    }
    pendingPackages.forEach(library => installedPackages.add(library))
    pendingPackages.clear()
  })

  // Listen for changes in the error markers to detect unresolved modules
  monaco.editor.onDidChangeMarkers(async event => {
    const model = monaco.editor.getModel(event[0])!
    const markers = monaco.editor.getModelMarkers({ resource: model.uri })

    for (const marker of markers) {
      if (marker.message.includes('Cannot find module')) {
        const match = marker.message.match(/Cannot find module '(.+?)'/)
        const packageName = match ? match[1].split('/')[0] : null

        if (
          packageName &&
          !pendingPackages.has(packageName) &&
          !installedPackages.has(packageName)
        ) {
          pendingPackages.add(packageName)
        }
      }
    }
  })
}

function watchLocalFiles(container: WebContainer, monaco: MonacoType) {
  // Fetch local files from virtual filesystem
  async function fetchLocalFiles() {
    let files: [string, string][] = []
    async function iterate(parentPath: string) {
      if (parentPath === './node_modules') return

      const dirContents = await container.fs.readdir(parentPath, { withFileTypes: true })

      for (const dirContent of dirContents) {
        if (dirContent.isDirectory()) {
          await iterate(parentPath + '/' + dirContent.name)
        } else {
          const path = parentPath + '/' + dirContent.name
          files.push([path, await container.fs.readFile(path, 'utf-8')])
        }
      }
    }
    await iterate('.')
    return files
  }

  // TODO: when we update the file-system (mount a new project, change file-names), we should update the models
  onMount(async () => {
    const files = await fetchLocalFiles()

    for (const [path, source] of files) {
      const uri = monaco.Uri.parse(`file:///${path.replace('./', '')}`)
      if (!monaco.editor.getModel(uri)) {
        monaco.editor.createModel(source, undefined, uri)
      }
    }

    watchCompilerOptions(container, monaco)
  })
}
