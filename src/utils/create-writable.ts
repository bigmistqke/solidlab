import { Accessor, createRenderEffect, createSignal } from 'solid-js'

export function createWritable<T>(accessor: Accessor<T>) {
  const [signal, setSignal] = createSignal<T>(null!)

  createRenderEffect(() => setSignal(accessor()!))

  return [signal, setSignal] as const
}
