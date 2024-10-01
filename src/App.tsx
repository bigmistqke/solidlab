import { WebContainer } from '@webcontainer/api'
import clsx from 'clsx'
import {
  Accessor,
  createContext,
  createResource,
  createSignal,
  For,
  onMount,
  Show,
  Suspense,
  useContext,
} from 'solid-js'
import styles from './App.module.css'
import { Codicon } from './codicon/codicon'
import { CodiconButton } from './codicon/codicon-button'
import { files } from './files'

function getNameFromPath(path: string) {
  const segments = path.split('/')
  return segments[segments.length - 1]
}

function Tab(props: { path: string }) {
  const repl = useRepl()
  return (
    <span
      class={clsx(styles.tab, repl.focusedTab() === props.path && styles.selected)}
      ref={element => onMount(() => element.scrollIntoView())}
    >
      <button onClick={() => repl.focusTab(props.path)}>{getNameFromPath(props.path)}</button>
      <CodiconButton kind="close" onClick={() => repl.closeTab(props.path)} />
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

function EditorPane(props: { tabs: string[] }) {
  const repl = useRepl()
  const container = useWebContainer()
  const [source] = createResource(repl.focusedTab, path => container.fs.readFile(path, 'utf-8'))
  return (
    <div class={styles.editorPane}>
      <Tabs />
      <Suspense fallback={<div style={{ flex: 1 }}>loading</div>}>
        <textarea
          class={styles.textarea}
          onInput={e => {
            container.fs.writeFile(repl.focusedTab(), e.currentTarget.value)
          }}
          value={source()}
        />
      </Suspense>
    </div>
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
          kind={open() ? 'chevron-down' : 'chevron-up'}
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
  const [contents] = createResource(() => container.fs.readdir(props.path, { withFileTypes: true }))
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

function Explorer(props: { path: string }) {
  return (
    <div class={styles.fileExplorer}>
      <Directory.Contents path="" layer={0} />
    </div>
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

function Repl() {
  const container = useWebContainer()

  const [tabs, setTabs] = createSignal<string[]>(['/src/app.tsx'])
  const [url, setUrl] = createSignal<string>()
  const [focusedTab, setFocusedTab] = createSignal<string>('/src/app.tsx')

  onMount(async () => {
    container.on('server-ready', (port, url) => setUrl(url))
    const installProcess = await container.spawn('npm', ['install'])
    installProcess.output.pipeTo(
      new WritableStream({
        write(data) {
          console.log(data)
        },
      }),
    )
    await installProcess.exit
    await container.spawn('npm', ['run', 'dev'])
  })

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
      <div class={styles.Repl} style={{ '--file-explorer-width': '200px' }}>
        <Explorer path="" />
        <EditorPane tabs={tabs()} />
        <iframe src={url()} class={styles.frame} />
      </div>
    </ReplContext.Provider>
  )
}

const WebContainerContext = createContext<WebContainer>()
export const useWebContainer = () => {
  const context = useContext(WebContainerContext)
  if (!context) {
    throw `useWebContainer should be used in a descendante of <WebContainerContext.Provider/>`
  }
  return context
}

function App() {
  const [webContainer] = createResource(async () => {
    const container = await WebContainer.boot()
    await container.mount(files)
    return container
  })

  return (
    <Show when={webContainer()}>
      <WebContainerContext.Provider value={webContainer()!}>
        <Repl />
      </WebContainerContext.Provider>
    </Show>
  )
}

export default App
