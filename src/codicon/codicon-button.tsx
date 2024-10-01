import { ComponentProps } from 'solid-js'
import { Codicon, CodiconKind } from './codicon'

export function CodiconButton(
  props: Omit<ComponentProps<'button'>, 'type' | 'kind'> & {
    kind: CodiconKind
    type?: 'bare' | 'default'
  },
) {
  return <Codicon {...props} as="button" />
}
