import { Split } from '@bigmistqke/solid-grid-split'
import { makePersisted } from '@solid-primitives/storage'
import { WebContainer } from '@webcontainer/api'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { Terminal as TerminalInstance } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import clsx from 'clsx'
import {
  Accessor,
  createContext,
  createResource,
  createSignal,
  For,
  onMount,
  Resource,
  Setter,
  Show,
  useContext,
} from 'solid-js'
import styles from './App.module.css'
import { Codicon } from './components/codicon/codicon'
import { CodiconButton } from './components/codicon/codicon-button'
import { Monaco } from './components/monaco'
import { files } from './files'
import { every, whenEffect } from './utils/conditionals'

function getNameFromPath(path: string) {
  const segments = path.split('/')
  return segments[segments.length - 1]
}

const terminal = new TerminalInstance({
  convertEol: true,
  fontSize: 10,
  lineHeight: 1,
})
const fitAddon = new FitAddon()
terminal.loadAddon(new WebLinksAddon())
terminal.loadAddon(fitAddon)

function Terminal() {
  const container = useWebContainer()

  whenEffect(container, async container => {
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

function Tab(props: { path: string }) {
  const repl = useRepl()
  const isFocused = () => repl.activeTab() === props.path
  return (
    <span
      class={clsx(styles.tab, isFocused() && styles.selected)}
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

function Tabs() {
  const repl = useRepl()
  return (
    <div class={styles.tabsContainer}>
      <div class={clsx(styles.tabs, styles.bar)}>
        <For each={repl.tabs()}>{tab => <Tab path={tab} />}</For>
      </div>
    </div>
  )
}

function EditorPane() {
  const repl = useRepl()
  const container = useWebContainer()
  const [source] = createResource(every(repl.activeTab, container), ([path, container]) =>
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

function File(props: { layer: number; path: string }) {
  const repl = useRepl()
  return (
    <button
      style={{
        '--explorer-layer': props.layer,
      }}
      class={clsx(repl.activeTab() === props.path && styles.selected)}
      onClick={() => {
        repl.addTab(props.path)
        repl.setActiveTab(props.path)
      }}
    >
      {getNameFromPath(props.path)}
    </button>
  )
}

function Directory(props: { path: string; layer: number; open?: boolean }) {
  const repl = useRepl()
  const [open, setOpen] = createSignal(props.open || false)
  return (
    <>
      <button
        style={{ '--explorer-layer': props.layer - 1 }}
        class={clsx(!open() && repl.activeTab().includes(props.path) && styles.selected)}
        onClick={() => setOpen(bool => !bool)}
      >
        <Codicon
          style={{ width: `var(--explorer-layer-offset)` }}
          as="span"
          kind={open() ? 'chevron-down' : 'chevron-right'}
        />
        {getNameFromPath(props.path)}
      </button>
      <Show when={open()}>
        <Directory.Contents path={props.path} layer={props.layer} />
      </Show>
    </>
  )
}

Directory.Contents = (props: { path: string; layer: number }) => {
  const container = useWebContainer()
  const [contents] = createResource(container, async container => {
    const contents = await container.fs.readdir(props.path, { withFileTypes: true })
    return contents.sort((a, b) => {
      if (a.isFile() && b.isDirectory()) {
        return 1
      }
      if (b.isFile() && a.isDirectory()) {
        return -1
      }
      return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1
    })
  })

  return (
    <For each={contents()}>
      {file => (
        <Show
          when={file.isDirectory()}
          fallback={<File path={`${props.path}/${file.name}`} layer={props.layer + 1} />}
        >
          <Directory path={`${props.path}/${file.name}`} layer={props.layer + 1} />
        </Show>
      )}
    </For>
  )
}

function SideBar() {
  const repl = useRepl()
  return (
    <Split.Pane size="40px" class={styles.sideBar}>
      <div>
        <CodiconButton kind="file" />
        <CodiconButton kind="cloud-upload" />
        <CodiconButton kind="file-directory" />
      </div>
      <div>
        <CodiconButton
          kind="color-mode"
          onClick={repl.toggleColorMode}
          class={clsx(repl.colorMode() === 'dark' && styles.colorModeButtonDark)}
        />
        <CodiconButton kind="github" />
      </div>
    </Split.Pane>
  )
}

function Explorer() {
  const container = useWebContainer()
  return (
    <Split.Pane max="50px" size="200px" class={clsx(styles.pane, styles.explorerPane)}>
      <div class={clsx(styles.explorerBar, styles.bar)}>
        <CodiconButton kind="new-file" />
        <CodiconButton kind="new-folder" />
      </div>
      <Show
        when={!container.loading}
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

function LoaderAnimation() {
  return <Codicon kind="loading" class={styles.loaderAnimation} />
}

function Frame() {
  const container = useWebContainer()
  const repl = useRepl()

  const loadingMessage = () => {
    if (!container()) return 'Booting Web Container!'
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

function Handle(props: { column?: boolean }) {
  return (
    <Split.Handle size="0px" class={clsx(styles.handle, props.column && styles.column)}>
      <div />
    </Split.Handle>
  )
}

const ReplContext = createContext<{
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

export function useRepl() {
  const context = useContext(ReplContext)
  if (!context) {
    throw `useTabs should be used in a descendant of Repl`
  }
  return context
}

function Repl() {
  const container = useWebContainer()

  const [tabs, setTabs] = createSignal<string[]>(['/src/app.tsx'])
  const [focusedTab, setFocusedTab] = createSignal<string>('/src/app.tsx')
  const [colorMode, setColorMode] = makePersisted(createSignal<'light' | 'dark'>('light'), {
    name: 'color-mode',
  })

  const [route, setRoute] = createSignal('/')
  const [baseUrl, setBaseUrl] = createSignal<string>()

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

  return (
    <ReplContext.Provider
      value={{
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
          setFocusedTab(path)
        },
        closeTab(path) {
          if (!tabs().includes(path)) return
          if (focusedTab() === path) {
            const index = tabs().indexOf(path)
            const nextIndex = index === 0 ? index + 1 : index - 1
            setFocusedTab(tabs()[nextIndex])
          }
          setTabs(tabs => tabs.filter(tab => tab !== path))
        },
        activeTab: focusedTab,
        tabs,
      }}
    >
      <Split
        class={clsx(styles.Repl, colorMode() === 'dark' && styles.dark)}
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
    </ReplContext.Provider>
  )
}

const WebContainerContext = createContext<Resource<WebContainer>>()
export const useWebContainer = () => {
  const context = useContext(WebContainerContext)
  if (!context) {
    throw `useWebContainer should be used in a descendante of <WebContainerContext.Provider/>`
  }
  return context
}

export function App() {
  const [webContainer] = createResource(async () => {
    const container = await WebContainer.boot()
    await container.mount(files)
    window.container = container
    return container
  })

  return (
    <WebContainerContext.Provider value={webContainer}>
      <Repl />
    </WebContainerContext.Provider>
  )
}
