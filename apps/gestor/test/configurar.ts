import { enableAutoUnmount } from '@vue/test-utils'
import ResizeObserver from 'resize-observer-polyfill'
import { afterEach } from 'vitest'

globalThis.ResizeObserver ??= ResizeObserver
enableAutoUnmount(afterEach)
