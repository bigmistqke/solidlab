import clsx from 'clsx'
import { Codicon } from './codicon/codicon'
import styles from './loader-animation.module.css'

export function LoaderAnimation(props: { class?: string }) {
  return <Codicon kind="loading" class={clsx(styles.loaderAnimation, props.class)} />
}
