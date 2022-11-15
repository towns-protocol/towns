import { setupServer } from 'msw/node'
import { testHandlers } from './handlers'
// This configures a request mocking server with the given request handlers.
export const server = setupServer(...testHandlers)
