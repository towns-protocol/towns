/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import '@testing-library/jest-dom'
import '@testing-library/jest-dom/extend-expect'
import { TestConstants } from './tests/integration/helpers/TestConstants'
import { TownsTestClient } from './tests/integration/helpers/TownsTestClient'
import { configure } from '@testing-library/dom'
import 'jest-canvas-mock'
import { queryClient } from './src/query/queryClient'
import * as dotenv from 'dotenv'

// load any env vars
// set DOTENV_CONFIG_PATH in package.json script
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH })

import path from 'path'
import os from 'os'
import { existsSync } from 'fs'

const localRiverCA = path.join(os.homedir(), 'river-ca-cert.pem')

if (!existsSync(localRiverCA)) {
    console.log('CA does not exist, did you forget to run ../scripts/register-ca.sh')
}
process.env.NODE_EXTRA_CA_CERTS = localRiverCA

process.env.NODE_ENV = 'test'
process.env.RIVER_ENV = process.env.RIVER_ENV || 'local_single'

// fetch-polyfill.js
import fetch, { Headers, Request, Response } from 'node-fetch'

beforeAll(async () => {
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
})

afterEach(() => {
    // stop all test clients
    return Promise.all([
        queryClient.cancelQueries().then(() => queryClient.resetQueries()),
        TownsTestClient.cleanup(),
    ])
}, 30_000)

afterAll(() => {
    // clear storage
    global.localStorage.clear()
    global.sessionStorage.clear()
    indexedDB = new IDBFactory()
})
