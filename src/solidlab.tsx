import { Split } from '@bigmistqke/solid-grid-split'
import { ContextMenu } from '@kobalte/core/context-menu'
import { makePersisted } from '@solid-primitives/storage'
import { WebContainer } from '@webcontainer/api'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { Terminal as TerminalInstance } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import clsx from 'clsx'
import {
  Accessor,
  batch,
  createContext,
  createRenderEffect,
  createResource,
  createSignal,
  For,
  JSX,
  onMount,
  Resource,
  Setter,
  Show,
  useContext,
} from 'solid-js'
import { Codicon } from './components/codicon/codicon'
import { CodiconButton } from './components/codicon/codicon-button'
import { Monaco } from './components/monaco'
import styles from './solidlab.module.css'
import { every, whenEffect } from './utils/conditionals'
import { createFileSystemTree } from './utils/create-file-system-tree'
import { createWritable } from './utils/create-writable'

function getNameFromPath(path: string) {
  const segments = path.split('/')
  return segments[segments.length - 1]
}

export const files = createFileSystemTree(
  await Promise.all(
    Object.entries(import.meta.glob(`./examples/basic/**/*`, { as: 'raw' })).map(
      async ([key, fn]) => [key.split('/').slice(3).join('/'), await fn()] as const,
    ),
  ),
)

/**********************************************************************************/
/*                                                                                */
/*                                Loader Animation                                */
/*                                                                                */
/**********************************************************************************/

function LoaderAnimation() {
  return <Codicon kind="loading" class={styles.loaderAnimation} />
}

/**********************************************************************************/
/*                                                                                */
/*                                      Handle                                    */
/*                                                                                */
/**********************************************************************************/

function Handle(props: { column?: boolean }) {
  return (
    <Split.Handle size="0px" class={clsx(styles.handle, props.column && styles.column)}>
      <div />
    </Split.Handle>
  )
}

/**********************************************************************************/
/*                                                                                */
/*                                    Terminal                                    */
/*                                                                                */
/**********************************************************************************/

const terminal = new TerminalInstance({
  convertEol: true,
  fontSize: 10,
  lineHeight: 1,
})
const fitAddon = new FitAddon()
terminal.loadAddon(new WebLinksAddon())
terminal.loadAddon(fitAddon)

function Terminal() {
  const repl = useSolidLab()

  whenEffect(repl.container, async container => {
    const shellProcess = await container.spawn('jsh')
    const shellInput = shellProcess.input.getWriter()

    shellProcess.output.pipeTo(
      new WritableStream({
        write(data) {
          terminal.write(data)
        },
      }),
    )

    terminal.onData(data => {
      shellInput.write(data)
    })
  })

  return (
    <Split.Pane
      size="250px"
      class={styles.terminal}
      ref={element => {
        onMount(() => {
          terminal.open(element)
          new ResizeObserver(() => fitAddon.fit()).observe(element)
        })
      }}
    />
  )
}

/**********************************************************************************/
/*                                                                                */
/*                                       Tab                                      */
/*                                                                                */
/**********************************************************************************/

function Tabs() {
  const repl = useSolidLab()

  function Tab(props: { path: string }) {
    const isFocused = () => repl.activeTab() === props.path
    return (
      <span
        class={clsx(styles.tab, isFocused() && styles.active)}
        ref={element => whenEffect(isFocused, () => element.scrollIntoView())}
      >
        <button class={styles.focusTabButton} onClick={() => repl.setActiveTab(props.path)}>
          {getNameFromPath(props.path)}
        </button>
        <CodiconButton
          class={styles.closeTabButton}
          kind="close"
          onClick={() => repl.closeTab(props.path)}
        />
      </span>
    )
  }

  return (
    <div class={styles.tabsContainer}>
      <div class={clsx(styles.tabs, styles.bar)}>
        <For each={repl.tabs()}>{tab => <Tab path={tab} />}</For>
      </div>
    </div>
  )
}

/**********************************************************************************/
/*                                                                                */
/*                                      Editor                                    */
/*                                                                                */
/**********************************************************************************/

function EditorPane() {
  const repl = useSolidLab()
  const [source] = createResource(every(repl.activeTab, repl.container), ([path, container]) =>
    container.fs.readFile(path, 'utf-8'),
  )
  return (
    <Split.Pane size="1fr" class={styles.editorPane}>
      <Tabs />
      <Show
        when={source() !== undefined}
        fallback={
          <div class={styles.suspenseMessage}>
            <LoaderAnimation />
          </div>
        }
      >
        <Monaco />
      </Show>
      <div class={clsx(styles.editorBar, styles.bar)}>
        <button>Tabs (2)</button>
        <button>Format</button>
      </div>
    </Split.Pane>
  )
}

/**********************************************************************************/
/*                                                                                */
/*                                    Explorer                                    */
/*                                                                                */
/**********************************************************************************/

function Explorer() {
  const repl = useSolidLab()

  function addNew(type: 'file' | 'directory') {
    const path =
      repl.selectedDirectory() || repl.activeTab()?.split('/').slice(0, -1).join('/') || ''

    repl.setNewContent({ type, path })
  }
  return (
    <Split.Pane max="50px" size="200px" class={clsx(styles.pane, styles.explorerPane)}>
      <div class={clsx(styles.explorerBar, styles.bar)}>
        <CodiconButton kind="new-file" onClick={() => addNew('file')} />
        <CodiconButton kind="new-folder" onClick={() => addNew('directory')} />
      </div>
      <Show
        when={!repl.container.loading}
        fallback={
          <div class={styles.suspenseMessage}>
            <LoaderAnimation />
          </div>
        }
      >
        <div class={styles.explorerContents}>
          <Directory.Contents path="" layer={0} />
        </div>
      </Show>
    </Split.Pane>
  )
}

function ExplorerInput(props: {
  layer: number
  value: string
  onSubmit: (event: { currentTarget: HTMLInputElement }) => void
  prefix?: JSX.Element
}) {
  let element: HTMLInputElement

  onMount(() => {
    // TODO: need to time out when it has hidden parents
    setTimeout(() => {
      element.focus()
      const length = props.value.split('.').slice(0, -1).join('.').length
      element.setSelectionRange(0, length || props.value.length)
    }, 125)
  })

  return (
    <div
      class={styles.explorerInput}
      style={{
        '--explorer-layer': props.layer,
      }}
    >
      {props.prefix}
      <input
        value={props.value}
        ref={element!}
        onFocusOut={props.onSubmit}
        onKeyDown={e => e.code === 'Enter' && props.onSubmit(e)}
      />
    </div>
  )
}

function File(props: { layer: number; path: string }) {
  const [name, setName] = createWritable(() => getNameFromPath(props.path))
  const repl = useSolidLab()
  const [renaming, setRenaming] = createSignal(false)

  function onRename(event: { currentTarget: HTMLInputElement }) {
    batch(() => {
      setRenaming(false)
      const name = event.currentTarget.value
      if (!name) {
        return
      }
      setName(name)
      const newPath = `${props.path.split('/').slice(0, -1).join('/')}/${name}`
      repl.container()?.fs.rename(props.path, newPath)
    })
  }

  return (
    <ContextMenu>
      <Show
        when={!renaming()}
        fallback={<ExplorerInput layer={props.layer} value={name()} onSubmit={onRename} />}
      >
        <ContextMenu.Trigger
          as="button"
          style={{
            '--explorer-layer': props.layer,
          }}
          class={clsx(repl.activeTab() === props.path && !repl.newContent() && styles.active)}
          onClick={() => {
            repl.addTab(props.path)
            repl.setActiveTab(props.path)
          }}
        >
          {name()}
        </ContextMenu.Trigger>
      </Show>
      <ContextMenu.Portal>
        <ContextMenu.Content class={styles.contextMenu}>
          <ContextMenu.Item class={styles.contextMenuItem} onClick={() => setRenaming(true)}>
            <span>Rename</span>
          </ContextMenu.Item>
          <ContextMenu.Item
            class={styles.contextMenuItem}
            onClick={() => {
              repl.container()?.fs.rm(props.path, { force: true })
            }}
          >
            <span>Delete</span>
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu>
  )
}

function Directory(props: { path: string; layer: number; open?: boolean }) {
  const repl = useSolidLab()

  const [name, setName] = createWritable(() => getNameFromPath(props.path))
  const [renaming, setRenaming] = createSignal(false)
  const [open, setOpen] = createSignal(props.open || false)

  whenEffect(repl.newContent, ({ path }) => {
    if (path.includes(props.path)) {
      setOpen(true)
    }
  })

  function onRename(event: { currentTarget: HTMLInputElement }) {
    batch(() => {
      setRenaming(false)
      const name = event.currentTarget.value
      if (!name) {
        return
      }
      setName(name)
      const newPath = `${props.path.split('/').slice(0, -1).join('/')}/${name}`
      repl.container()?.fs.rename(props.path, newPath)
    })
  }

  return (
    <>
      <ContextMenu>
        <Show
          when={!renaming()}
          fallback={
            <ExplorerInput
              layer={props.layer - 1}
              prefix={
                <Codicon
                  style={{ width: `var(--explorer-layer-offset)` }}
                  as="span"
                  kind={open() ? 'chevron-down' : 'chevron-right'}
                />
              }
              value={name()}
              onSubmit={onRename}
            />
          }
        >
          <ContextMenu.Trigger
            as="button"
            style={{ '--explorer-layer': props.layer - 1 }}
            class={clsx(
              !open() && repl.activeTab().includes(props.path) && styles.active,
              !repl.newContent() && repl.selectedDirectory() === props.path && styles.selected,
            )}
            onClick={() => {
              setOpen(bool => !bool)
              repl.setSelectedDirectory(props.path)
            }}
          >
            <Codicon
              style={{ width: `var(--explorer-layer-offset)` }}
              as="span"
              kind={open() ? 'chevron-down' : 'chevron-right'}
            />
            {name()}
          </ContextMenu.Trigger>
        </Show>
        <Show when={open()}>
          <Directory.Contents path={props.path} layer={props.layer} />
        </Show>
        <ContextMenu.Portal>
          <ContextMenu.Content class={styles.contextMenu}>
            <ContextMenu.Item class={styles.contextMenuItem} onClick={() => setRenaming(true)}>
              <span>Rename</span>
            </ContextMenu.Item>
            <ContextMenu.Item
              class={styles.contextMenuItem}
              onClick={() => {
                repl.container()?.fs.rm(props.path, { force: true, recursive: true })
              }}
            >
              <span>Delete</span>
            </ContextMenu.Item>
            <ContextMenu.Separator class={styles.contextMenuSeparator} />
            <ContextMenu.Item
              class={styles.contextMenuItem}
              onClick={() => repl.setNewContent({ type: 'file', path: props.path })}
            >
              <span>Create File</span>
            </ContextMenu.Item>
            <ContextMenu.Item
              class={styles.contextMenuItem}
              onClick={() => repl.setNewContent({ type: 'directory', path: props.path })}
            >
              <span>Create Directory</span>
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu>
    </>
  )
}

Directory.Contents = (props: { path: string; layer: number }) => {
  const repl = useSolidLab()

  const [contents, { refetch }] = createResource(repl.container, async container => {
    const contents = await container.fs.readdir(props.path, { withFileTypes: true })
    const files = contents
      .filter(content => content.isFile())
      .sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1))
      .map(value => value.name)
    const directories = contents
      .filter(content => content.isDirectory())
      .sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1))
      .map(value => value.name)
    return {
      files,
      directories,
    }
  })

  whenEffect(repl.container, container => container.fs.watch(props.path, refetch))

  return (
    <>
      <For each={contents.latest?.directories}>
        {file => <Directory path={`${props.path}/${file}`} layer={props.layer + 1} />}
      </For>
      <Show when={repl.newContent()?.path === props.path && repl.newContent()!} keyed>
        {({ type, path }) => (
          <Directory.NewContent
            path={path}
            type={type}
            layer={type === 'directory' ? props.layer : props.layer + 1}
            prefix={
              type === 'directory' ? (
                <Codicon
                  style={{ width: `var(--explorer-layer-offset)` }}
                  as="span"
                  kind="chevron-right"
                />
              ) : undefined
            }
          />
        )}
      </Show>
      <For each={contents.latest?.files}>
        {file => <File path={`${props.path}/${file}`} layer={props.layer + 1} />}
      </For>
    </>
  )
}

Directory.NewContent = (props: {
  path: string
  type: 'file' | 'directory'
  layer: number
  prefix?: JSX.Element
}) => {
  const repl = useSolidLab()
  const container = repl.container()

  if (!container) {
    throw `Tried to add new content before repl.container is initialised.`
  }

  async function submitNewContent(event: { currentTarget: HTMLInputElement }) {
    const value = event.currentTarget.value
    if (value !== '') {
      const newPath = `${props.path}/${value}`
      if (props.type === 'file') {
        await container!.fs.writeFile(newPath, '')
        repl.setActiveTab(newPath)
        repl.addTab(newPath)
      } else {
        await container!.fs.mkdir(newPath)
      }
    }
    repl.setNewContent(undefined)
  }

  return (
    <ExplorerInput prefix={props.prefix} layer={props.layer} value="" onSubmit={submitNewContent} />
  )
}

/**********************************************************************************/
/*                                                                                */
/*                                    Side Bar                                    */
/*                                                                                */
/**********************************************************************************/

function SideBar() {
  const repl = useSolidLab()
  return (
    <Split.Pane size="40px" class={styles.sideBar}>
      <div>
        <CodiconButton kind="add" style={{ transform: 'rotateZ(90deg)' }} />
        <CodiconButton kind="search" />
        <CodiconButton kind="arrow-down" />
        <CodiconButton kind="arrow-up" />
      </div>
      <div>
        <CodiconButton
          kind="color-mode"
          onClick={repl.toggleColorMode}
          class={clsx(repl.colorMode() === 'dark' && styles.colorModeButtonDark)}
        />
      </div>
    </Split.Pane>
  )
}

/**********************************************************************************/
/*                                                                                */
/*                                      Frame                                     */
/*                                                                                */
/**********************************************************************************/

function Frame() {
  const repl = useSolidLab()

  const loadingMessage = () => {
    if (!repl.container()) return 'Booting Web Container!'
    if (!repl.progress.packagesInstalled()) return 'Installing Node Modules!'

    if (!repl.baseUrl()) return 'Initializing Development Server!'
    return undefined
  }

  onMount(() => {
    window.addEventListener(
      'message',
      e => {
        if (typeof e.data !== 'object') return
        if (e.data.type === 'url-changed') {
          const [, route] = e.data.location.split('local-corp.webcontainer-api.io')
          repl.setRoute(route)
        }
      },
      false,
    )
  })

  return (
    <Split.Pane class={clsx(styles.pane, styles.framePane)}>
      <div class={clsx(styles.locationBar, styles.bar)}>
        <CodiconButton
          kind="debug-restart"
          onClick={() => {
            const _baseUrl = repl.baseUrl()
            repl.setBaseUrl(undefined)
            requestAnimationFrame(() => repl.setBaseUrl(_baseUrl))
          }}
        />
        <input
          spellcheck={false}
          value={repl.route()}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              repl.setRoute(event.currentTarget.value)
            }
          }}
        />
      </div>
      <Show
        when={!loadingMessage()}
        fallback={
          <div class={clsx(styles.suspenseMessage, styles.frame)}>
            <LoaderAnimation /> {loadingMessage()}
          </div>
        }
      >
        <iframe src={repl.baseUrl() + repl.route()} class={styles.frame} />
      </Show>
    </Split.Pane>
  )
}

/**********************************************************************************/
/*                                                                                */
/*                                       Repl                                     */
/*                                                                                */
/**********************************************************************************/

const SolidLabContext = createContext<{
  container: Resource<WebContainer>
  selectedDirectory: Accessor<string | undefined>
  setSelectedDirectory: Setter<string | undefined>
  setNewContent: Setter<{ path: string; type: 'directory' | 'file' } | undefined>
  newContent: Accessor<{ path: string; type: 'directory' | 'file' } | undefined>
  activeTab: () => string
  setActiveTab: (path: string) => void
  addTab: (path: string) => void
  baseUrl: Accessor<string | undefined>
  setBaseUrl: Setter<string | undefined>
  closeTab: (path: string) => void
  colorMode: Accessor<'dark' | 'light'>
  progress: { packagesInstalled: Resource<boolean> }
  route: Accessor<string>
  setRoute: Setter<string>
  tabs: Accessor<string[]>
  toggleColorMode: () => void
}>()

export function useSolidLab() {
  const context = useContext(SolidLabContext)
  if (!context) {
    throw `useTabs should be used in a descendant of Repl`
  }
  return context
}

export function SolidLab() {
  const [container] = createResource(async () => {
    const container = await WebContainer.boot()
    await container.mount(files)
    window.container = container
    return container
  })

  const [tabs, setTabs] = createSignal<string[]>(['/src/app.tsx'])
  const [activeTab, setActiveTab] = createSignal<string>('/src/app.tsx')
  const [selectedDirectory, setSelectedDirectory] = createWritable<string | undefined>(
    () => activeTab() && undefined,
  )
  const [colorMode, setColorMode] = makePersisted(createSignal<'light' | 'dark'>('light'), {
    name: 'color-mode',
  })

  const [route, setRoute] = createSignal('/')
  const [baseUrl, setBaseUrl] = createSignal<string>()

  const [newContent, setNewContent] = createSignal<
    { path: string; type: 'file' | 'directory' } | undefined
  >(undefined)

  const [packagesInstalled] = createResource(container, async container => {
    container.on('server-ready', (port, url) => {
      console.log('port is ', port)
      setBaseUrl(url)
    })

    terminal.writeln('npm install')

    const installProcess = await container.spawn('npm', ['install'])
    installProcess.output.pipeTo(
      new WritableStream({
        write(data) {
          terminal.writeln(data)
        },
      }),
    )
    await installProcess.exit
    return true
  })

  whenEffect(every(container, packagesInstalled), async ([container]) => {
    terminal.writeln('pnpm dev')
    const process = await container.spawn('pnpm', ['dev'])
    process.output.pipeTo(
      new WritableStream({
        write(data) {
          terminal.write(data)
        },
      }),
    )
  })

  createRenderEffect(() => {
    document.body.dataset.colorMode = colorMode()
  })

  return (
    <SolidLabContext.Provider
      value={{
        container,
        selectedDirectory,
        setSelectedDirectory,
        newContent,
        setNewContent,
        route,
        setRoute,
        progress: {
          packagesInstalled,
        },
        baseUrl,
        setBaseUrl,
        colorMode,
        toggleColorMode() {
          setColorMode(mode => (mode === 'light' ? 'dark' : 'light'))
        },
        addTab(path) {
          if (tabs().includes(path)) return
          setTabs(tabs => [...tabs, path])
        },
        setActiveTab(path) {
          setActiveTab(path)
        },
        closeTab(path) {
          if (!tabs().includes(path)) return
          if (activeTab() === path) {
            const index = tabs().indexOf(path)
            const nextIndex = index === 0 ? index + 1 : index - 1
            setActiveTab(tabs()[nextIndex])
          }
          setTabs(tabs => tabs.filter(tab => tab !== path))
        },
        activeTab,
        tabs,
      }}
    >
      <Split
        class={clsx(styles.solidlab, colorMode() === 'dark' && styles.dark)}
        style={{ '--explorer-width': '200px', '--terminal-height': '250px' }}
      >
        <SideBar />
        <Explorer />
        <Handle />
        <EditorPane />
        <Handle />
        <Split type="row" class={styles.pane}>
          <Frame />
          <Handle column />
          <Terminal />
        </Split>
      </Split>
    </SolidLabContext.Provider>
  )
}
