/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import '@testing-library/jest-dom'
import '@testing-library/jest-dom/extend-expect'
import { request as matrixRequest } from 'matrix-js-sdk'
import { TestConstants } from './tests/integration/helpers/TestConstants'
import { ZionTestClient } from './tests/integration/helpers/ZionTestClient'
import Olm from '@matrix-org/olm'
import request from 'request'
import { configure } from '@testing-library/dom'
import 'jest-canvas-mock'

process.env.NODE_ENV = 'test'
process.env.HOMESERVER = 'http://localhost:8008' // OR "https://node1.zion.xyz";
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
        asyncUtilTimeout: 5000, // default is 1000
    })
    // set up required global for the matrix client to allow us to make http requests
    matrixRequest(request)
})

afterEach(() => {
    // stop all test clients
    return ZionTestClient.cleanup()
}, 5000)

afterAll(() => {
    // clear storage
    global.localStorage.clear()
    global.sessionStorage.clear()
})
