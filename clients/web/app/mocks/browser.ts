// src/mocks/browser.js
import { setupWorker } from 'msw'

import { browserHandlers } from './handlers'
import { env } from '../src/utils/environment'

// This configures a Service Worker with the given request handlers.
// evan 7.11.23 - MSW is disabled for browser. We weren't using it and it complicated the work on our own service worker. If we want to re-enable this, we should integrate it into our own service worker like https://github.com/mswjs/msw/discussions/1034
export const worker = env.VITE_ENABLE_MSW_BROWSER ? setupWorker(...browserHandlers) : {}
