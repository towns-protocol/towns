import 'fake-indexeddb/auto'
import createFetchMock from 'vitest-fetch-mock'
import { vi } from 'vitest'

const fetchMocker = createFetchMock(vi)
import { readFile } from 'fs/promises'
import { resolve } from 'path'

const olmWasmPath = resolve(__dirname, '../../node_modules/@matrix-org/olm/olm.wasm')

// Return olm.wasm from olm package
fetchMocker.mockIf(/olm\.wasm$/, async (_req: Request) => {
    try {
        const wasmContent = await readFile(olmWasmPath) // Read binary data

        // Construct and return a Response object
        return new Response(wasmContent, {
            status: 200,
            headers: {
                'Content-Type': 'application/wasm',
                'Cache-Control': 'public, max-age=31536000, immutable', // Optional caching
                'Access-Control-Allow-Origin': '*', // Optional CORS
            },
        })
    } catch (error) {
        console.error('Error serving .wasm file:', error)

        // Return a 500 Response object on error
        return new Response('Internal Server Error', {
            status: 500,
            headers: {
                'Content-Type': 'text/plain',
            },
        })
    }
})

fetchMocker.enableMocks()
