import { WebContainer } from '@webcontainer/api'
import { createEffect, createResource, createSignal, Suspense, type Component } from 'solid-js'
import styles from './App.module.css'
import { files } from './files'
import { when } from './utils/conditionals'

const App: Component = () => {
  const [path, setPath] = createSignal('src/index.js')

  const [source, setSource] = createSignal<string>(files['src'].directory['index.js'].file.contents)

  const [webContainer] = createResource(async () => {
    const container = await WebContainer.boot()
    await container.mount(files)

    return {
      startDevServer(): Promise<string> {
        return new Promise(async resolve => {
          // Run `npm run start` to start the Express app
          await container.spawn('npm', ['run', 'start'])

          // Wait for `server-ready` event
          container.on('server-ready', (port, url) => resolve(url))
        })
      },

      async installDependencies() {
        // Install dependencies
        const installProcess = await container.spawn('npm', ['install'])
        installProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              console.log(data)
            },
          }),
        )
        // Wait for install command to exit
        return installProcess.exit
      },

      writeFile(path: string, content: string) {
        return container.fs.writeFile(path, content)
      },
    }
  })

  const [url] = createResource(webContainer, async container => {
    const exitCode = await container.installDependencies()
    if (exitCode !== 0) {
      throw new Error('Installation failed')
    }
    return container.startDevServer()
  })

  createEffect(when(webContainer, container => container.writeFile(path(), source())))

  createEffect(() => console.log(url()))

  return (
    <div class={styles.App}>
      <textarea onInput={e => setSource(e.currentTarget.value)} value={source()} />
      <Suspense fallback={<div>LOADING</div>}>
        <iframe src={url()} />
      </Suspense>
    </div>
  )
}

export default App
