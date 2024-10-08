// @refresh reload
import { mount, StartClient } from '@solidjs/start/client'

mount(() => {
  // To detect pushState and replaceState changes, you can override them:
  const originalPushState = history.pushState
  history.pushState = function (...args) {
    originalPushState.apply(history, args)
    window.parent.postMessage({ type: 'url-changed', location: window.location.href }, '*')
  }

  const originalReplaceState = history.replaceState
  history.replaceState = function (...args) {
    originalReplaceState.apply(history, args)
    window.parent.postMessage({ type: 'url-changed', location: window.location.href }, '*')
  }

  return <StartClient />
}, document.getElementById('app')!)
