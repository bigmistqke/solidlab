import { WebContainer } from '@webcontainer/api'
import { createEffect, createResource, createSignal, Suspense, type Component } from 'solid-js'
import styles from './App.module.css'
import { files } from './files'
import { when } from './utils/conditionals'

const App: Component = () => {
  const [path, setPath] = createSignal('src/app.tsx')
  const [url, setUrl] = createSignal<string>()
  const [source, setSource] = createSignal<string>(files['src'].directory['app.tsx'].file.contents)

  const [webContainer] = createResource(async () => {
    const container = await WebContainer.boot()
    await container.mount(files)

    const api = {
      async startDevServer() {
        // Run `npm run start` to start the Express app
        const process = await container.spawn('npm', ['run', 'dev'])

        console.log('spawned command', process)

        container.on('error', console.error)
        container.on('preview-message', console.info)
        // Wait for `server-ready` event
        container.on('server-ready', (port, url) => {
          console.log('port is ', port, url)
          setUrl(url)
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
      fs: container.fs,
    }

    const exitCode = await api.installDependencies()
    if (exitCode !== 0) {
      throw new Error('Installation failed')
    }
    await api.startDevServer()

    return api
  })

  createEffect(when(webContainer, container => container.fs.writeFile(path(), source())))

  createEffect(
    when(webContainer, async container =>
      console.log(await container.fs.readFile(path(), 'utf-8')),
    ),
  )

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
