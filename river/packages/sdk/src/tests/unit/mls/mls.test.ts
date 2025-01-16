/**
 * @group main
 */

import { Client as MlsClient } from '@river-build/mls-rs-wasm'
import { randomBytes } from 'crypto'

describe('mls', () => {
    test('initialize mls group', async () => {
        const deviceKey = new Uint8Array(randomBytes(32))
        const client = await MlsClient.create(deviceKey)
        const group = await client.createGroup()
        expect(group).toBeDefined()
    })
})
