import { Setter } from 'solid-js'

export function toggle(setter: Setter<boolean>) {
  return setter((value) => !value)
}
export function onToggle(setter: Setter<boolean>) {
  return () => toggle(setter)
}
