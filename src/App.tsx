import { Split } from '@bigmistqke/solid-grid-split'
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
  Show,
  useContext,
} from 'solid-js'
import { TmTextarea } from 'tm-textarea/solid'
import { Grammar } from 'tm-textarea/tm'
import styles from './App.module.css'
import { Codicon } from './codicon/codicon'
import { CodiconButton } from './codicon/codicon-button'
import { files } from './files'
import { every, whenEffect } from './utils/conditionals'

function getNameFromPath(path: string) {
  const segments = path.split('/')
  return segments[segments.length - 1]
}

const terminal = new TerminalInstance({ convertEol: true, fontSize: 10, lineHeight: 1 })
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
  const isFocused = () => repl.focusedTab() === props.path
  return (
    <span
      class={clsx(styles.tab, isFocused() && styles.selected)}
      ref={element => whenEffect(isFocused, () => element.scrollIntoView())}
    >
      <button class={styles.focusTabButton} onClick={() => repl.focusTab(props.path)}>
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
      <div class={styles.tabs}>
        <For each={repl.tabs()}>{tab => <Tab path={tab} />}</For>
      </div>
    </div>
  )
}

const getTypeFromPath = (path: string): Grammar => {
  const extension = path.split('.').pop()
  switch (extension) {
    case 'tsx':
      return 'tsx'
    case 'ts':
      return 'typescript'
    case 'js':
      return 'javascript'
    case 'jsx':
      return 'jsx'
    case 'json':
      return 'json'
    case 'css':
      return 'css'
    default:
      return 'tsx'
  }
}

function EditorPane(props: { tabs: string[] }) {
  const repl = useRepl()
  const container = useWebContainer()
  const [source] = createResource(every(repl.focusedTab, container), ([path, container]) =>
    container.fs.readFile(path, 'utf-8'),
  )
  return (
    <Split.Pane size="1fr" class={styles.editorPane}>
      <Tabs />
      <Show
        when={source() !== undefined}
        fallback={<div class={styles.suspenseMessage}>Loading File!</div>}
      >
        <TmTextarea
          class={styles.textarea}
          onInput={e => container()!.fs.writeFile(repl.focusedTab(), e.currentTarget.value)}
          value={source() || ''}
          theme="vitesse-light"
          grammar={getTypeFromPath(repl.focusedTab())}
        />
      </Show>
    </Split.Pane>
  )
}

function File(props: { layer: number; path: string }) {
  const repl = useRepl()
  return (
    <button
      style={{ '--explorer-layer': props.layer }}
      onClick={() => {
        repl.addTab(props.path)
        repl.focusTab(props.path)
      }}
    >
      {getNameFromPath(props.path)}
    </button>
  )
}

function Directory(props: { path: string; layer: number; open?: boolean }) {
  const [open, setOpen] = createSignal(props.open || false)
  return (
    <>
      <button
        style={{ '--explorer-layer': props.layer - 1 }}
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
  const [contents] = createResource(container, container =>
    container.fs.readdir(props.path, { withFileTypes: true }),
  )

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

function Explorer() {
  const container = useWebContainer()
  return (
    <Split.Pane size="200px" class={clsx(styles.pane, styles.explorerPane)}>
      <h1>Solid Lab</h1>
      <Show when={!container.loading} fallback={<div class={styles.suspenseMessage}>Loading!</div>}>
        <div class={styles.explorer}>
          <Directory.Contents path="" layer={0} />
        </div>
      </Show>
    </Split.Pane>
  )
}

const ReplContext = createContext<{
  addTab: (path: string) => void
  focusTab: (path: string) => void
  closeTab: (path: string) => void
  tabs: Accessor<string[]>
  focusedTab: () => string
}>()

function useRepl() {
  const context = useContext(ReplContext)
  if (!context) {
    throw `useRepl should be used in a descendant of Repl`
  }
  return context
}

function Frame() {
  const [url, setUrl] = createSignal<string>()
  const container = useWebContainer()

  const [packagesInstalled] = createResource(container, async container => {
    container.on('server-ready', (port, url) => setUrl(url))

    terminal.writeln('npm install')

    const installProcess = await container.spawn('npm', ['install'])
    installProcess.output.pipeTo(
      new WritableStream({
        write(data) {
          console.log(data)
          terminal.writeln(data)
        },
      }),
    )
    await installProcess.exit
    return true
  })

  whenEffect(every(container, packagesInstalled), async ([container]) => {
    terminal.writeln('npm run dev')
    const process = await container.spawn('npm', ['run', 'dev'])
    process.output.pipeTo(
      new WritableStream({
        write(data) {
          terminal.write(data)
        },
      }),
    )
  })

  const loadingMessage = () => {
    if (!container()) return 'Loading Web Container!'
    if (!packagesInstalled()) return 'Installing Node Modules!'
    if (!url()) return 'Initializing Development Server!'
    return undefined
  }

  return (
    <Split.Pane class={styles.pane}>
      <Show
        when={!loadingMessage()}
        fallback={<div class={clsx(styles.suspenseMessage, styles.frame)}>{loadingMessage()}</div>}
      >
        <iframe
          src={url()}
          class={styles.frame}
          onError={error => console.error('IFRAME ERRORS!!!', error)}
        />
      </Show>
    </Split.Pane>
  )
}

function Repl() {
  const [tabs, setTabs] = createSignal<string[]>(['/src/app.tsx'])
  const [focusedTab, setFocusedTab] = createSignal<string>('/src/app.tsx')

  return (
    <ReplContext.Provider
      value={{
        addTab(path) {
          if (tabs().includes(path)) return
          setTabs(tabs => [...tabs, path])
        },
        focusTab(path) {
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
        focusedTab: focusedTab,
        tabs,
      }}
    >
      <Split
        class={styles.Repl}
        style={{ '--explorer-width': '200px', '--terminal-height': '250px' }}
      >
        <Explorer />
        <Split.Handle size="5px" class={styles.handle} />
        <EditorPane tabs={tabs()} />
        <Split.Handle size="5px" class={styles.handle} />
        <Split type="row">
          <Frame />
          <Split.Handle size="5px" class={clsx(styles.handle, styles.vertical)} />
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
    return container
  })

  return (
    <WebContainerContext.Provider value={webContainer}>
      <Repl />
    </WebContainerContext.Provider>
  )
}
