import { defineConfig } from 'vite'
import mkcert from 'vite-plugin-mkcert'
import solidPlugin from 'vite-plugin-solid'

export default defineConfig({
  plugins: [
    {
      name: 'configure-response-headers',
      configureServer: server => {
        server.middlewares.use((_req, res, next) => {
          res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
          next()
        })
      },
    },
    solidPlugin(),
    mkcert(),
  ],
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
  },
})
