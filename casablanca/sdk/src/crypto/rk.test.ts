/**
 * @group rk
 */

import { RK, RDK } from './rk'
import { indexedDB } from 'fake-indexeddb'
import { RiverKeysStorage } from './store/river-keys'

describe('rk', () => {
    test('verifyRdk', async () => {
        const rk = RK.createRandom()
        let rdk0 = RDK.createRandom()
        rdk0 = await rk.signRdk(rdk0)
        expect(rdk0.delegateSig?.length).toBe(65)
        // verify
        const recovered = rk.verifyRdk(rdk0)
        expect(recovered).toBe(true)
    })

    test('verifyRdkStorage', async () => {
        const store = new RiverKeysStorage(indexedDB, `river-sdk:crypto:test`)
        await store.startup()
        const rk = await store.withTransaction((tx) => store.initializeRK(tx))
        let rdk = await store.withTransaction((tx) => store.initializeRDK(tx))
        expect(rdk.delegateSig?.length).toBe(65)
        // verify
        const recovered = rk.verifyRdk(rdk)
        expect(recovered).toBe(true)

        // check stored rdk
        rdk = await store.withTransaction((tx) => store.initializeRDK(tx))
        expect(rdk.delegateSig?.length).toBe(65)
        // verify
        expect(rk.verifyRdk(rdk)).toBe(true)
    })
})
