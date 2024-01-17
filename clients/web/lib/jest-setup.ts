/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import '@testing-library/jest-dom'
import '@testing-library/jest-dom/extend-expect'
import { AutoDiscovery } from 'matrix-js-sdk'
import { TestConstants } from './tests/integration/helpers/TestConstants'
import { ZionTestClient } from './tests/integration/helpers/ZionTestClient'
import Olm from '@matrix-org/olm'
import { configure } from '@testing-library/dom'
import 'jest-canvas-mock'
import { queryClient } from './src/query/queryClient'
import * as dotenv from 'dotenv'

// load any env vars
// set DOTENV_CONFIG_PATH in package.json script
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH })

process.env.NODE_ENV = 'test'
process.env.CASABLANCA_SERVER_URL = process.env.CASABLANCA_SERVER_URL || 'http://localhost:5157'
process.env.DISABLE_ENCRYPTION = 'false'
process.env.ETHERS_NETWORK = process.env.ETHERS_NETWORK || 'http://127.0.0.1:8545' // OR "rinkeby"

// fetch-polyfill.js
import fetch, { Headers, Request, Response } from 'node-fetch'

beforeAll(async () => {
    globalThis.Olm = Olm
    await globalThis.Olm.init()
    // dom testing library config for `waitFor(...)`
    configure({
        asyncUtilTimeout: TestConstants.DefaultWaitForTimeoutMS, // default is 1000
    })

    if (!globalThis.fetch) {
        globalThis.fetch = fetch as unknown as typeof globalThis.fetch
        globalThis.Headers = Headers as unknown as typeof globalThis.Headers
        globalThis.Request = Request as unknown as typeof globalThis.Request
        globalThis.Response = Response as unknown as typeof globalThis.Response
    }
    AutoDiscovery.setFetchFn(globalThis.fetch)
})

afterEach(() => {
    // stop all test clients
    return Promise.all([
        queryClient.cancelQueries().then(() => queryClient.resetQueries()),
        ZionTestClient.cleanup(),
    ])
}, 5000)

afterAll(() => {
    // clear storage
    global.localStorage.clear()
    global.sessionStorage.clear()
    indexedDB = new IDBFactory()
})
