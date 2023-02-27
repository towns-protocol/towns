/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import '@testing-library/jest-dom'
import '@testing-library/jest-dom/extend-expect'
import { AutoDiscovery } from 'matrix-js-sdk'
import { TestConstants } from './tests/integration/helpers/TestConstants'
import { ZionTestClient } from './tests/integration/helpers/ZionTestClient'
import Olm from '@matrix-org/olm'
import fetch from 'node-fetch'
import { configure } from '@testing-library/dom'
import 'jest-canvas-mock'
import { queryClient } from './src/query/queryClient'
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'

process.env.NODE_ENV = 'test'
process.env.HOMESERVER = 'http://localhost:8008' // OR "https://node1.towns.com";
process.env.CASABLANCA_SERVER_URL = 'http://localhost:7104/json-rpc'
process.env.DISABLE_ENCRYPTION = 'false'
process.env.ETHERS_NETWORK = 'http://127.0.0.1:8545' // OR "rinkeby"

// initialize the static wallets
TestConstants.init()

beforeAll(async () => {
    globalThis.Olm = Olm
    await globalThis.Olm.init()
    // dom testing library config for `waitFor(...)`
    configure({
        asyncUtilTimeout: TestConstants.DefaultWaitForTimeoutMS, // default is 1000
    })
    // set up required global for the matrix client to allow us to make http requests
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    AutoDiscovery.setFetchFn(fetchForTests)
    global.fetch = fetchForTests
})

afterEach(() => {
    // stop all test clients
    return Promise.all([queryClient.resetQueries(), ZionTestClient.cleanup()])
}, 5000)

afterAll(() => {
    // clear storage
    global.localStorage.clear()
    global.sessionStorage.clear()
    indexedDB = new IDBFactory()
})

/// aellis 1.29.2023 not sure if i'm doing this right, but it seems to work
/// matrix uses global.fetch, which doesn't exist outside the browser
/// and... the types don't match up.
async function fetchForTests(
    resource: URL | RequestInfo,
    options?: RequestInit | undefined,
): ReturnType<typeof global.fetch> {
    if (typeof resource === 'string') {
        // do nothing
    } else if (resource instanceof URL) {
        resource = resource.toString()
    } else {
        resource = resource.url
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument
    const retval = await fetch(resource, options as any)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return retval as unknown as ReturnType<typeof global.fetch>
}
