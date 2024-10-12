import { Split } from '@bigmistqke/solid-grid-split'
import { Tooltip } from '@kobalte/core/Tooltip'
import { ContextMenu } from '@kobalte/core/context-menu'
import { Dialog } from '@kobalte/core/dialog'
import { Skeleton } from '@kobalte/core/skeleton'
import { Toast, toaster } from '@kobalte/core/toast'
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
  createMemo,
  createRenderEffect,
  createResource,
  createSignal,
  For,
  Index,
  JSX,
  onCleanup,
  onMount,
  Resource,
  Setter,
  Show,
  useContext,
} from 'solid-js'
import { createStore, SetStoreFunction } from 'solid-js/store'
import { Portal } from 'solid-js/web'
import { Codicon } from './components/codicon/codicon'
import { CodiconButton } from './components/codicon/codicon-button'
import { LoaderAnimation } from './components/loader-animation'
import { Monaco } from './components/monaco'
import utilities from './solidex'
import {
  ResourceCategory,
  ResourceCategoryName,
  Resource as ResourceKind,
} from './solidex/Ecosystem'
import styles from './solidlab.module.css'
import { composeRegex } from './utils/compose-regex'
import { every, when, whenEffect } from './utils/conditionals'
import { createFileSystemTree } from './utils/create-file-system-tree'
import { createWritable } from './utils/create-writable'
import { getMatchedRanges } from './utils/get-matched-ranges'
import { getNameFromPath } from './utils/get-name-from-path'
import { normalizePath } from './utils/normalize-path'
import { onToggle } from './utils/on-toggle'

export const files = createFileSystemTree(
  await Promise.all(
    Object.entries(import.meta.glob(`./examples/basic/**/*`, { as: 'raw' })).map(
      async ([key, fn]) => [key.split('/').slice(3).join('/'), await fn()] as const,
    ),
  ),
)

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
/*                                 Manager Modal                                  */
/*                                                                                */
/**********************************************************************************/

export function MainDialog() {
  return (
    <Dialog.Portal>
      <Dialog.Overlay class={styles.dialogOverlay} />
      <div class={styles.dialogPositioner}>
        <Dialog.Content class={clsx(styles.dialogContent, styles.mainDialogContent)}>
          <div class={styles.dialogBody}>
            <div>
              <Dialog.Title class={clsx(styles.mainDialogBar, styles.dialogTitle)}>
                SOLIDLAB
              </Dialog.Title>
              <div class={styles.mainDialogBar} />
              <div class={styles.mainDialogOptions}>
                <button class={styles.mainDialogOption}>
                  <Codicon kind="new-file" class={styles.mainDialogOptionIcon} />
                  <span class={styles.dialogButtonTitle}>New Project</span>
                </button>
                <button class={styles.mainDialogOption}>
                  <Codicon kind="save" class={styles.mainDialogOptionIcon} />
                  <span class={styles.dialogButtonTitle}>Save Project</span>
                </button>
                <div class={styles.dialogSeparator} />
                <button class={styles.mainDialogOption}>
                  <Codicon kind="folder-opened" class={styles.mainDialogOptionIcon} />
                  <span class={styles.dialogButtonTitle}>Open Project</span>
                </button>
                <button class={styles.mainDialogOption}>
                  <Codicon kind="arrow-down" class={styles.mainDialogOptionIcon} />
                  <span class={styles.dialogButtonTitle}>Import Project</span>
                </button>
              </div>
              <div class={styles.mainDialogBar} />
            </div>
            <div class={styles.dialogSeparator} />
            <div class={styles.mainDialogColumn}>
              <div class={clsx(styles.mainDialogBar, styles.closeButtonContainer)}>
                <Dialog.CloseButton as={CodiconButton} kind="close" class={styles.closeButton} />
              </div>
              <div class={styles.mainDialogBar} />
              <div class={styles.mainDialogOptions}>
                <button class={styles.mainDialogOption}>
                  <Codicon kind="share" class={styles.mainDialogOptionIcon} />
                  <span class={styles.dialogButtonTitle}>Share Project</span>
                </button>
                <button class={styles.mainDialogOption}>
                  <Codicon kind="file-zip" class={styles.mainDialogOptionIcon} />
                  <span class={styles.dialogButtonTitle}>Export As Zip</span>
                </button>
                <button class={styles.mainDialogOption}>
                  <Codicon kind="github" class={styles.mainDialogOptionIcon} />
                  <span class={styles.dialogButtonTitle}>Publish To Github</span>
                </button>
                <div class={styles.dialogSeparator} />
                <div class={styles.mainDialogOptionContainer}>
                  <button class={styles.mainDialogOption}>
                    <Codicon kind="check" class={styles.mainDialogOptionIcon} />
                    <span class={styles.dialogButtonTitle}>WebContainers</span>
                  </button>
                  <Tooltip closeDelay={500} openDelay={125}>
                    <Tooltip.Trigger
                      as={CodiconButton}
                      kind="question"
                      class={styles.mainDialogOptionIcon}
                      /* optical padding */
                      style={{
                        'padding-left': 'calc(var(--margin) / 2 + 1px)',
                      }}
                    />
                    <Tooltip.Portal>
                      <Tooltip.Content class={styles.popoverContent}>
                        <Tooltip.Arrow />
                        <div
                          class={clsx(
                            styles.popoverHeader,
                            styles.closeButtonContainer,
                            styles.mainDialogBar,
                          )}
                        >
                          <h2 class={styles.popoverTitle}>About WebContainers</h2>
                        </div>
                        <div class={styles.popoverDescription}>
                          <a href="https://webcontainers.io/guides/introduction" target="__blank">
                            WebContainers
                          </a>{' '}
                          provide a browser-based environment for running Node.js applications and
                          executing operating system commands directly within your browser tab.
                          <br />
                          <br />
                          If WebContainers is disabled SolidLab falls back to{' '}
                          <a href="https://github.com/bigmistqke/repl">@bigmistqke/repl</a>. This
                          package is not suited for SolidStart applications, but can be useful for
                          quick prototyping of client-side code.
                        </div>
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip>
                </div>
              </div>
              <div class={styles.mainDialogBar} />
            </div>
            <div class={styles.dialogSeparator} />
            <div class={styles.mainDialogColumn}></div>
          </div>
        </Dialog.Content>
      </div>
    </Dialog.Portal>
  )
}

/**********************************************************************************/
/*                                                                                */
/*                                   NPM Modal                                    */
/*                                                                                */
/**********************************************************************************/

export function NPMDialog() {
  const solidlab = useSolidLab()

  const [query, setQuery] = createSignal('')

  const [results] = createResource(query, async query => {
    if (!query) {
      return []
    }
    const result = await fetch(`https://registry.npmjs.org/-/v1/search?text=${query}`).then(value =>
      value.json(),
    )
    return result.objects || []
  })

  return (
    <Dialog.Portal>
      <Dialog.Overlay class={styles.dialogOverlay} />
      <div class={styles.dialogPositioner}>
        <Dialog.Content
          class={clsx(
            styles.dialogContent,
            styles.searchDialog,
            styles.npmDialog,
            query() === '' && styles.closed,
          )}
        >
          <div class={styles.searchHeader}>
            <div class={styles.searchContainer}>
              <input
                class={styles.search}
                onInput={e => setQuery(e.currentTarget.value)}
                value={query()}
                placeholder="Enter Package Name"
              />
              <Codicon kind={query() ? 'close' : 'search'} class={styles.searchIcon} />
            </div>
          </div>
          <Show when={results.latest && results.latest.length > 0 && query() !== ''}>
            <div class={styles.searchResults}>
              <div />
              <Index each={results.latest}>
                {(result, index) => {
                  return (
                    <>
                      <div class={clsx(styles.searchResultHeader, styles.sticky)}>
                        <h3>{result().package.name}</h3>
                        <Codicon
                          class={styles.searchResultHeaderIcon}
                          as="a"
                          kind="link"
                          target="__blank"
                          href={result().package.links.repository || result().package.links.npm}
                        />
                        <Dialog.CloseButton
                          as={CodiconButton}
                          kind="git-stash"
                          class={styles.searchResultHeaderIcon}
                          onClick={() => {
                            solidlab.installPackage(result().package.name)
                          }}
                        />
                      </div>
                      <div class={styles.searchResultDescription}>
                        {result().package.description}
                      </div>
                      <Show when={result().package.keywords}>
                        <div class={styles.searchResultBottomBar}>
                          <div class={styles.searchLabels}>
                            <Index each={result().package.keywords}>
                              {keyword => <div class={styles.searchLabel}>{keyword()}</div>}
                            </Index>
                          </div>
                        </div>
                      </Show>

                      <Show when={index !== results.latest.length - 1}>
                        <div class={styles.separator} />
                      </Show>
                    </>
                  )
                }}
              </Index>
              <div />
            </div>
          </Show>
        </Dialog.Content>
      </div>
    </Dialog.Portal>
  )
}

/**********************************************************************************/
/*                                                                                */
/*                                 Solidex Modal                                  */
/*                                                                                */
/**********************************************************************************/

export function SolidexDialog() {
  const solidlab = useSolidLab()

  const [activeLabels, setActiveLabels] = createSignal([
    ResourceCategory.Primitives,
    ResourceCategory.Routers,
    ResourceCategory.Data,
    ResourceCategory.DataVisualization,
    ResourceCategory.UI,
    ResourceCategory.Plugins,
    ResourceCategory.Starters,
    ResourceCategory.BuildUtilities,
    ResourceCategory.AddOn,
    ResourceCategory.Testing,
    ResourceCategory.Educational,
  ])

  const [data] = createResource(() => import('./solidex').then(module => module.default))

  const [query, setQuery] = createSignal('')

  const results = createMemo<ResourceKind[]>(
    when(
      data,
      data => {
        const lowercaseQuery = query().toLowerCase()
        return data.filter(library => {
          if (lowercaseQuery && !library.title.toLowerCase().includes(lowercaseQuery)) {
            return false
          }
          return library.categories.find(category => activeLabels().includes(category))
        })
      },
      () => [],
    ),
  )

  const categories = (Object.keys(ResourceCategoryName) as Array<ResourceCategory>)
    .map(category => {
      const amount = utilities.filter(utility => utility.categories.includes(category)).length
      return {
        category,
        amount,
      }
    })
    .filter(({ amount }) => amount !== 0)
    .sort((a, b) => b.amount - a.amount)

  return (
    <Dialog.Portal>
      <Dialog.Overlay class={styles.dialogOverlay} />
      <div class={styles.dialogPositioner}>
        <Dialog.Content class={clsx(styles.dialogContent, styles.searchDialog)}>
          <div class={styles.searchHeader}>
            <div class={styles.searchContainer}>
              <input
                class={styles.search}
                onInput={e => setQuery(e.currentTarget.value)}
                value={query()}
                placeholder="Enter Package Name"
              />
              <CodiconButton
                disabled={query() === ''}
                kind={query() ? 'close' : 'search'}
                class={styles.searchIcon}
              />
            </div>
          </div>
          <div class={styles.solidexDialogBody}>
            <div class={styles.searchLabels} style={{ 'flex-wrap': 'nowrap' }}>
              <For each={categories}>
                {({ category, amount }) => {
                  return (
                    <button
                      onClick={() => {
                        setActiveLabels(labels => {
                          if (labels.includes(category)) {
                            return labels.filter(label => label !== category)
                          }
                          return [...labels, category]
                        })
                      }}
                      class={clsx(
                        styles.searchLabel,
                        styles[category],
                        !activeLabels().includes(category) && styles.inactive,
                      )}
                    >
                      {category} ({amount})
                    </button>
                  )
                }}
              </For>
            </div>
            <div class={styles.searchResults}>
              <Show when={results()!.length > 0}>
                <div />
                <Index each={results()}>
                  {(result, index) => {
                    return (
                      <>
                        <SolidexResult {...result()} activeLabels={activeLabels()} />
                        <Show when={index !== results().length - 1}>
                          <div class={styles.separator} />
                        </Show>
                      </>
                    )
                  }}
                </Index>
                <div />
              </Show>
            </div>
          </div>
        </Dialog.Content>
      </div>
    </Dialog.Portal>
  )
}

function SolidexResult(props: {
  activeLabels: ResourceCategory[]
  categories: readonly ResourceCategory[]
  description?: string
  keywords?: readonly string[]
  link: string
  package?: string | string[]
  title: string
}) {
  const solidlab = useSolidLab()
  const [visibleSubPackages, setVisibleSubPackages] = createSignal(false)
  let description: HTMLDivElement
  let header: HTMLDivElement
  return (
    <>
      <div ref={header!} class={clsx(styles.searchResultHeader, styles.sticky)}>
        <h3>{props.title}</h3>
        <Codicon
          class={styles.searchResultHeaderIcon}
          as="a"
          kind="link"
          target="__blank"
          href={props.link}
        />
        <Show
          when={!Array.isArray(props.package) && (props.package || props.title)}
          fallback={
            <CodiconButton
              kind={visibleSubPackages() ? 'remove' : 'add'}
              class={styles.searchResultHeaderIcon}
              onClick={() => {
                setVisibleSubPackages(packages => !packages)
                if (!visibleSubPackages()) {
                  if (
                    description.parentElement!.scrollTop > header.offsetTop - 1 &&
                    description.parentElement!.scrollTop < header.offsetTop + 1
                  ) {
                    description!.scrollIntoView()
                    requestAnimationFrame(() => {
                      description.parentElement!.scrollTop =
                        description.parentElement!.scrollTop - 42 - 30
                    })
                  }
                } else {
                }
              }}
            />
          }
        >
          {packageName => (
            <Dialog.CloseButton
              as={CodiconButton}
              kind={Array.isArray(props.package) ? 'add' : 'git-stash'}
              class={styles.searchResultHeaderIcon}
              onClick={() => solidlab.installPackage(packageName())}
            />
          )}
        </Show>
      </div>

      <div ref={description!} class={styles.searchResultDescription}>
        {props.description}
      </div>
      <div class={styles.searchResultBottomBar}>
        <div class={styles.searchLabels}>
          <Index each={props.categories}>
            {category => (
              <div
                class={clsx(
                  styles.searchLabel,
                  styles[category()],
                  !props.activeLabels.includes(category()) && styles.inactive,
                )}
              >
                {category()}
              </div>
            )}
          </Index>
        </div>
        <Show when={!visibleSubPackages()}>
          <div class={styles.searchLabels}>
            <Index each={props.keywords}>
              {keyword => <div class={styles.searchLabel}>{keyword()}</div>}
            </Index>
          </div>
        </Show>
      </div>

      <Show when={visibleSubPackages() && Array.isArray(props.package) && props.package}>
        {subPackage => (
          <>
            {/* <div class={styles.separator} /> */}
            <Index each={subPackage()}>
              {(title, index) => (
                <>
                  <SolidexSubPackage title={title()} index={index} />
                  <Show when={index !== subPackage().length - 1}>
                    <div class={clsx(styles.separator, styles.subPackageSeparator)} />
                  </Show>
                </>
              )}
            </Index>
          </>
        )}
      </Show>
    </>
  )
}

function SolidexSubPackage(props: { title: string; index: number }) {
  const solidlab = useSolidLab()

  const [data] = createResource(() =>
    fetch(`https://registry.npmjs.org/-/v1/search?text=${props.title}&size=1`)
      .then(response => response.json())
      .then(response => response.objects?.[0]?.package as Record<string, any>),
  )

  return (
    <>
      <div class={styles.searchResultHeader} style={{ 'padding-left': 'calc(var(--margin) * 3)' }}>
        <h3>{props.title}</h3>
        <Codicon
          class={styles.searchResultHeaderIcon}
          as="a"
          kind="link"
          target="__blank"
          href={data()?.links.repository || data()?.links.npm}
        />
        <Dialog.CloseButton
          as={CodiconButton}
          kind={'git-stash'}
          class={styles.searchResultHeaderIcon}
          onClick={() => solidlab.installPackage(props.title)}
        />
      </div>

      <div class={clsx(styles.searchResultDescription, styles.subPackageDescription)}>
        <Show
          when={data()}
          fallback={
            <Skeleton animate visible={!data()} class={styles.skeleton}>
              This is a description of a library. This is a description of a library. This is a
              description of a library. This is a description of a library.This is a description of
              a library.
            </Skeleton>
          }
        >
          {data()?.description}
        </Show>
      </div>
      <div class={clsx(styles.searchResultBottomBar, styles.subPackageBottomBar)}>
        <div class={styles.searchLabels}>
          <Show
            when={data()}
            fallback={
              <Index each={['label', 'label', 'label']}>
                {keyword => (
                  <div class={styles.searchLabel} style={{ padding: '0px' }}>
                    <Skeleton class={styles.skeleton}>{keyword()}</Skeleton>
                  </div>
                )}
              </Index>
            }
          >
            <Index each={data()?.keywords}>
              {keyword => <div class={styles.searchLabel}>{keyword()}</div>}
            </Index>
          </Show>
        </div>
      </div>
    </>
  )
}

/**********************************************************************************/
/*                                                                                */
/*                                    Terminal                                    */
/*                                                                                */
/**********************************************************************************/

function Terminal() {
  const solidlab = useSolidLab()

  const fitAddon = new FitAddon()
  solidlab.terminal.loadAddon(new WebLinksAddon())
  solidlab.terminal.loadAddon(fitAddon)

  whenEffect(solidlab.webContainer, async container => {
    const shellProcess = await container.spawn('jsh')
    const shellInput = shellProcess.input.getWriter()

    shellProcess.output.pipeTo(
      new WritableStream({
        write(data) {
          solidlab.terminal.write(data)
        },
      }),
    )

    solidlab.terminal.onData(data => {
      shellInput.write(data)
    })
  })

  return (
    <Split.Pane
      size="250px"
      class={styles.terminal}
      ref={element => {
        onMount(() => {
          solidlab.terminal.open(element)
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
  const solidlab = useSolidLab()

  function Tab(props: { path: string }) {
    const isFocused = () => solidlab.activeTab() === props.path
    return (
      <span
        class={clsx(styles.tab, isFocused() && styles.active)}
        ref={element => whenEffect(isFocused, () => element.scrollIntoView())}
      >
        <button class={styles.focusTabButton} onClick={() => solidlab.setActiveTab(props.path)}>
          {getNameFromPath(props.path)}
        </button>
        <CodiconButton
          class={styles.barCloseButton}
          kind="close"
          onClick={() => solidlab.closeTab(props.path)}
        />
      </span>
    )
  }

  return (
    <div class={styles.tabsContainer}>
      <div class={clsx(styles.tabs, styles.bar)}>
        <For each={solidlab.tabs()}>{tab => <Tab path={tab} />}</For>
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
  const [source] = createResource(every(repl.activeTab, repl.webContainer), ([path, container]) =>
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
/*                                     Search                                     */
/*                                                                                */
/**********************************************************************************/

export interface RegexConfig {
  query: string
  isRegex: boolean
  isWholeWord: boolean
  isCaseSensitive: boolean
}
export interface UpdateAllConfig {
  search: RegexConfig
  replace: string
}
interface Match {
  path: string
  source: string
  ranges: Array<{
    start: number
    end: number
  }>
}

/** SearchAndReplace component allows searching and replacing text within multiple files. */
export function SearchAndReplace() {
  const { search, setSearch, setSearchInput, webContainer } = useSolidLab()

  let replaceInput: HTMLInputElement
  let searchIcons: HTMLDivElement

  const regex = () => composeRegex(search.searchQuery, search)

  const [matches] = createResource(every(regex, webContainer), async ([regex, container]) => {
    const query = search.searchQuery

    if (!query) {
      return []
    }

    const result: Match[] = []

    async function iterate(path: string) {
      if (path === './node_modules') {
        return
      }
      const dirContents = await container.fs.readdir(path, { withFileTypes: true })

      await Promise.all(
        dirContents.map(async content => {
          const contentPath = `${path}/${content.name}`

          if (contentPath.endsWith('package-lock.json')) {
            return
          }

          if (content.isDirectory()) {
            return await iterate(contentPath)
          }

          const source = await container.fs.readFile(contentPath, 'utf-8')
          const ranges = getMatchedRanges(source, regex)

          if (ranges.length > 0) {
            result.push({
              ranges,
              source,
              path: normalizePath(contentPath),
            })
          }
        }),
      )
    }

    await iterate('.')

    return result
  })

  return (
    <>
      <div class={clsx(styles.explorerBar, styles.bar)}>
        <CodiconButton kind="new-file" />
        <CodiconButton kind="new-folder" />
      </div>
      <div class={styles.searchAndReplace}>
        <div class={styles.inputContainer}>
          <input
            id="search-input"
            aria-label="Find Input"
            title="Find Input"
            placeholder="Find"
            autocomplete="off"
            ref={setSearchInput}
            value={search.searchQuery}
            onInput={e => setSearch('searchQuery', e.currentTarget.value)}
          />
          <div ref={searchIcons!} class={styles.inputIcons}>
            <CodiconButton
              aria-label="Match Case"
              title="Match Case"
              kind="case-sensitive"
              class={search.isCaseSensitive ? styles.active : undefined}
              onClick={() => setSearch('isCaseSensitive', boolean => !boolean)}
            />
            <CodiconButton
              aria-label="Match Whole Word"
              title="Match Whole Word"
              kind="whole-word"
              class={search.isWholeWord ? styles.active : undefined}
              onClick={() => setSearch('isWholeWord', boolean => !boolean)}
            />
            <CodiconButton
              aria-label="Use Regular Expression"
              title="Use Regular Expression"
              class={search.isRegex ? styles.active : undefined}
              kind="regex"
              onClick={() => setSearch('isRegex', boolean => !boolean)}
            />
          </div>
        </div>
        <div class={styles.inputContainer}>
          <input
            ref={replaceInput!}
            aria-label="Replace Input"
            placeholder="Replace"
            onInput={e => setSearch('replaceQuery', e.currentTarget.value)}
          />
          <div class={styles.inputIcons} data-break-350-show>
            <CodiconButton aria-label="Replace Next Occurences" kind="replace" />
            <CodiconButton aria-label="Replace All Occurences" kind="replace-all" />
          </div>
        </div>
      </div>
      <div class={styles.searchResultsContainer}>
        <div class={styles.searchResults}>
          <Index each={matches()}>
            {(match, index) => (
              <SearchResult {...match()} isLast={matches()!.length - 1 === index} />
            )}
          </Index>
        </div>
      </div>
    </>
  )
}

function SearchResult(props: Match & { isLast: boolean }) {
  const { setActiveTab } = useSolidLab()

  const [open, setOpen] = createSignal(true)

  return (
    <>
      <button class={styles.file} onClick={onToggle(setOpen)}>
        <Codicon class={styles.fileIcon} kind={open() ? 'chevron-down' : 'chevron-right'} />
        <span class={styles.fileName}>{getNameFromPath(props.path)}</span>
      </button>
      <Show when={open()}>
        <Index each={props.ranges}>
          {range => (
            <button class={styles.searchResult} onClick={() => setActiveTab(props.path)}>
              <span>
                {props.source.slice(Math.max(0, range().start - 10), range().start)}
                <em>{props.source.slice(range().start, range().end)}</em>
                {props.source.slice(range().end, props.source.length)}
              </span>
            </button>
          )}
        </Index>
      </Show>
      <Show when={!props.isLast}>
        <div class={clsx(styles.separator, open() && styles.open)} />
      </Show>
    </>
  )
}

/**********************************************************************************/
/*                                                                                */
/*                                    Explorer                                    */
/*                                                                                */
/**********************************************************************************/

function Explorer() {
  const solidlab = useSolidLab()

  function addNew(type: 'file' | 'directory') {
    const path =
      solidlab.selectedDirectory() || solidlab.activeTab()?.split('/').slice(0, -1).join('/') || ''
    solidlab.setNewContent({ type, path })
  }

  return (
    <>
      <div class={clsx(styles.explorerBar, styles.bar)}>
        <CodiconButton
          class={styles.barCloseButton}
          kind="new-file"
          onClick={() => addNew('file')}
        />
        <CodiconButton
          class={styles.barCloseButton}
          kind="new-folder"
          onClick={() => addNew('directory')}
        />
      </div>
      <Show
        when={!solidlab.webContainer.loading}
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
    </>
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
  const solidlab = useSolidLab()

  const [name, setName] = createWritable(() => getNameFromPath(props.path))
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
      solidlab.webContainer()?.fs.rename(props.path, newPath)
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
          class={clsx(
            solidlab.activeTab() === props.path && !solidlab.newContent() && styles.active,
          )}
          onClick={() => solidlab.setActiveTab(props.path)}
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
              solidlab.webContainer()?.fs.rm(props.path, { force: true })
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
  const solidlab = useSolidLab()

  const [name, setName] = createWritable(() => getNameFromPath(props.path))
  const [renaming, setRenaming] = createSignal(false)
  const [open, setOpen] = createSignal(props.open || false)

  whenEffect(solidlab.newContent, ({ path }) => {
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
      solidlab.webContainer()?.fs.rename(props.path, newPath)
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
              !open() && solidlab.activeTab().includes(props.path) && styles.active,
              !solidlab.newContent() &&
                solidlab.selectedDirectory() === props.path &&
                styles.selected,
            )}
            onClick={() => {
              setOpen(bool => !bool)
              solidlab.setSelectedDirectory(props.path)
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
                solidlab.webContainer()?.fs.rm(props.path, { force: true, recursive: true })
              }}
            >
              <span>Delete</span>
            </ContextMenu.Item>
            <ContextMenu.Separator class={styles.contextMenuSeparator} />
            <ContextMenu.Item
              class={styles.contextMenuItem}
              onClick={() => solidlab.setNewContent({ type: 'file', path: props.path })}
            >
              <span>Create File</span>
            </ContextMenu.Item>
            <ContextMenu.Item
              class={styles.contextMenuItem}
              onClick={() => solidlab.setNewContent({ type: 'directory', path: props.path })}
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
  const solidlab = useSolidLab()

  const [contents, { refetch }] = createResource(solidlab.webContainer, async container => {
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

  whenEffect(solidlab.webContainer, container => container.fs.watch(props.path, refetch))

  return (
    <>
      <For each={contents.latest?.directories}>
        {file => <Directory path={`${props.path}/${file}`} layer={props.layer + 1} />}
      </For>
      <Show when={solidlab.newContent()?.path === props.path && solidlab.newContent()!} keyed>
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
  const solidlab = useSolidLab()
  const container = solidlab.webContainer()

  if (!container) {
    throw `Tried to add new content before repl.container is initialised.`
  }

  async function submitNewContent(event: { currentTarget: HTMLInputElement }) {
    const value = event.currentTarget.value
    if (value !== '') {
      const newPath = `${props.path}/${value}`
      if (props.type === 'file') {
        await container!.fs.writeFile(newPath, '')
        solidlab.setActiveTab(newPath)
      } else {
        await container!.fs.mkdir(newPath)
      }
    }
    solidlab.setNewContent(undefined)
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
  const solidlab = useSolidLab()

  return (
    <Split.Pane size="50px" class={styles.sideBar}>
      <div>
        <Dialog>
          <Dialog.Trigger as={CodiconButton} kind="three-bars" />
          <MainDialog />
        </Dialog>
        <CodiconButton
          class={clsx(solidlab.actionMode() === 'explorer' && styles.active)}
          kind="files"
          onClick={() => solidlab.setActionMode('explorer')}
        />
        <CodiconButton
          class={clsx(solidlab.actionMode() === 'search' && styles.active)}
          kind="search"
          onClick={() => {
            solidlab.setActionMode('search')
            solidlab.searchInput()?.focus()
          }}
        />
        <Dialog>
          <Dialog.Trigger as={CodiconButton} kind="fold-down" />
          <NPMDialog />
        </Dialog>
        <Dialog>
          <Dialog.Trigger as="button" class={styles.logoContainer}>
            <svg
              style={{ height: '100%', flex: 1 }}
              width="43.920834mm"
              height="41.089794mm"
              viewBox="0 0 43.920834 41.089794"
              version="1.1"
              id="svg1"
              xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
              xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
              xmlns="http://www.w3.org/2000/svg"
              xmlns:svg="http://www.w3.org/2000/svg"
            >
              <path d="m 32.713955,18.905217 5.01029,-1.729752 4.57044,-7.7642973 c 0,0 -13.45745,-10.09358121 -23.86792,-7.7642933 l -0.76175,0.2588163 c -1.52347,0.5176134 -2.79304,1.2940451 -3.5548,2.3292878 l -0.50783,0.7764297 -4.0510301,7.1367828 c -1.22528,1.867949 -1.1804,4.324351 0.24234,6.58014 0.5703401,0.755761 1.2816201,1.433161 2.0906701,2.014616" />
              <path d="M 37.724245,17.175465 C 25.921375,8.6262814 13.108335,6.7258638 9.5364549,12.170972" />
              <path d="m 25.790285,39.174299 0.76173,-0.258808 c 1.81607,-0.544435 3.13773,-1.592787 3.87049,-2.87523 l 0.003,-4.88e-4 5.01253,-9.029338 c 1.01565,-1.811669 0.76173,-3.88215 -0.50784,-5.952622 -2.908,-3.703031 -7.72872,-5.238557 -12.18788,-3.882154 l -15.7426801,5.176195 -5.07522,9.055821 c 0,0 13.4545501,10.354912 23.8650401,7.766819 z" />
              <path d="m 30.422505,36.040261 c 1.00887,-1.765758 0.90127,-3.975308 -0.56961,-5.924311 -2.90799,-3.70303 -7.72873,-5.238542 -12.18788,-3.882142 L 1.9237549,31.40941" />
            </svg>
          </Dialog.Trigger>
          <SolidexDialog />
        </Dialog>
      </div>
      <div>
        <CodiconButton
          kind="color-mode"
          onClick={solidlab.toggleColorMode}
          class={clsx(solidlab.colorMode() === 'dark' && styles.colorModeButtonDark)}
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
  const solidlab = useSolidLab()

  const loadingMessage = () => {
    if (!solidlab.webContainer()) return 'Booting Web Container!'
    if (!solidlab.progress.packagesInstalled()) return 'Installing Node Modules!'

    if (!solidlab.baseUrl()) return 'Initializing Development Server!'
    return undefined
  }

  onMount(() => {
    window.addEventListener(
      'message',
      e => {
        if (typeof e.data !== 'object') return
        if (e.data.type === 'url-changed') {
          const [, route] = e.data.location.split('local-corp.webcontainer-api.io')
          solidlab.setRoute(route)
        }
      },
      false,
    )
  })

  return (
    <>
      <Split.Pane size="30px" min="30px" max="30px" class={clsx(styles.locationBar, styles.bar)}>
        <CodiconButton
          kind="debug-restart"
          onClick={() => {
            const _baseUrl = solidlab.baseUrl()
            solidlab.setBaseUrl(undefined)
            requestAnimationFrame(() => solidlab.setBaseUrl(_baseUrl))
          }}
        />
        <input
          spellcheck={false}
          value={solidlab.route()}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              solidlab.setRoute(event.currentTarget.value)
            }
          }}
        />
      </Split.Pane>
      <Split.Pane class={clsx(styles.pane, styles.framePane)}>
        <Show
          when={!loadingMessage()}
          fallback={
            <div class={clsx(styles.suspenseMessage, styles.frame)}>
              <LoaderAnimation /> {loadingMessage()}
            </div>
          }
        >
          <iframe src={solidlab.baseUrl() + solidlab.route()} class={styles.frame} />
        </Show>
      </Split.Pane>
    </>
  )
}

/**********************************************************************************/
/*                                                                                */
/*                                       Repl                                     */
/*                                                                                */
/**********************************************************************************/

const SolidLabContext = createContext<{
  setSearch: SetStoreFunction<{
    searchQuery: string
    replaceQuery: string
    isRegex: boolean
    isCaseSensitive: boolean
    isWholeWord: boolean
  }>
  search: {
    searchQuery: string
    replaceQuery: string
    isRegex: boolean
    isCaseSensitive: boolean
    isWholeWord: boolean
  }
  installPackage: (packageName: string) => Promise<boolean>
  webContainer: Resource<WebContainer>
  terminal: TerminalInstance
  setSearchInput: Setter<HTMLInputElement | undefined>
  searchInput: Accessor<HTMLInputElement | undefined>
  actionMode: Accessor<'search' | 'explorer'>
  setActionMode: Setter<'search' | 'explorer'>
  selectedDirectory: Accessor<string | undefined>
  setSelectedDirectory: Setter<string | undefined>
  setNewContent: Setter<{ path: string; type: 'directory' | 'file' } | undefined>
  newContent: Accessor<{ path: string; type: 'directory' | 'file' } | undefined>
  activeTab: () => string
  setActiveTab: (path: string) => void
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
  const terminal = new TerminalInstance({
    convertEol: true,
    fontSize: 10,
    lineHeight: 1,
  })

  const [tabs, setTabs] = createSignal<string[]>(['/src/app.tsx'])
  const [activeTab, setActiveTab] = createSignal<string>('/src/app.tsx')
  const [searchInput, setSearchInput] = createSignal<HTMLInputElement>()
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
  const [actionMode, setActionMode] = createSignal<'explorer' | 'search'>('explorer')

  const [search, setSearch] = createStore({
    searchQuery: '',
    replaceQuery: '',
    isRegex: false,
    isCaseSensitive: false,
    isWholeWord: false,
  })

  const [webContainer] = createResource(async () => {
    const webContainer = await WebContainer.boot()
    await webContainer.mount(files)
    // TODO: remove
    window.webContainer = webContainer
    return webContainer
  })

  const [packagesInstalled] = createResource(webContainer, async container => {
    container.on('server-ready', (port, url) => {
      console.info('port is ', port)
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

  whenEffect(every(webContainer, packagesInstalled), async ([container]) => {
    terminal.writeln('pnpm dev')
    const process = await container.spawn('npm', ['run', 'dev'])
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

  async function installPackage(packageName: string) {
    const container = webContainer()
    if (!container) {
      throw `Trying to install a package before WebContainer is initialised`
    }

    terminal.writeln('npm install')

    let id = toaster.promise(new Promise<void>(_resolve => {}), props => {
      const [ellipsis, setEllipsis] = createSignal(0)

      let timeout: number
      function step() {
        timeout = setTimeout(() => {
          setEllipsis(number => number + 1)
          step()
        }, 500)
      }
      step()

      onCleanup(() => clearTimeout(timeout))

      return (
        <Toast toastId={props.toastId} class={styles.toast} persistent>
          <div class={styles.toastContent}>
            <Toast.Title class={styles.toastTitle}>
              Downloading {packageName}
              <span innerHTML={'.'.repeat(ellipsis() % 4)} />
              <span style={{ color: 'transparent' }} innerHTML={'.'.repeat(3 - (ellipsis() % 4))} />
            </Toast.Title>
          </div>
        </Toast>
      )
    })

    const installProcess = await container.spawn('npm', ['add', packageName])

    installProcess.output.pipeTo(
      new WritableStream({
        write(data) {
          terminal.writeln(data)
        },
      }),
    )
    await installProcess.exit

    toaster.update(id, props => (
      <Toast toastId={props.toastId} class={styles.toast}>
        <div class={styles.toastContent}>
          <Toast.Title class={styles.toastTitle}>{packageName} installed!</Toast.Title>
        </div>
      </Toast>
    ))

    return true
  }

  return (
    <SolidLabContext.Provider
      value={{
        installPackage,
        search,
        setSearch,
        terminal,
        webContainer,
        setSearchInput,
        searchInput,
        actionMode,
        setActionMode,
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
        setActiveTab(path) {
          if (!tabs().includes(path)) {
            setTabs(tabs => [...tabs, path])
          }

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
        style={{ '--terminal-height': '250px' }}
      >
        <SideBar />
        <Split.Pane max="100px" size="200px" class={clsx(styles.pane, styles.actionPane)}>
          <Show when={actionMode() === 'explorer'} fallback={<SearchAndReplace />}>
            <Explorer />
          </Show>
        </Split.Pane>
        <Handle />
        <EditorPane />
        <Handle />
        <Split type="row" class={styles.pane}>
          <Portal>
            <Toast.Region duration={3000}>
              <Toast.List class={styles.toastList} />
            </Toast.Region>
          </Portal>
          <Frame />
          <Handle column />
          <Terminal />
        </Split>
      </Split>
    </SolidLabContext.Provider>
  )
}
