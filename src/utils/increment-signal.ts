import { Setter } from 'solid-js'

export function incrementSignal(setter: Setter<number>, max: number) {
  return setter((value) => {
    value = value + 1
    if (value > max) {
      return 0
    }
    return value
  })
}
export function decrementSignal(setter: Setter<number>, max: number) {
  return setter((value) => {
    value = value - 1
    if (value < 0) {
      return max - 1
    }
    return value
  })
}
