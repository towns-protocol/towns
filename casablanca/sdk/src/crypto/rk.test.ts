/**
 * @group rk
 */

import { RK, RDK } from './rk'
import { indexedDB } from 'fake-indexeddb'
import { IndexedDBCryptoStore } from './store/indexeddb-crypto-store'
import { Auth } from './store/auth'

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
        const run = async (store: IndexedDBCryptoStore, expectedStore: string) => {
            await store.startup()
            const auth = new Auth(store)
            const rk = await auth.initializeRK()
            let rdk = await auth.initializeRDK()
            rdk = await auth.signRDK()
            expect(rdk.delegateSig?.length).toBe(65)
            // verify
            const recovered = rk.verifyRdk(rdk)
            expect(recovered).toBe(true)

            // check stored rdk
            rdk = await auth.initializeRDK()
            expect(rdk.delegateSig?.length).toBe(65)
            // verify
            expect(rk.verifyRdk(rdk)).toBe(true)
            // make sure tests are still running against indexeddb
            expect(store.cryptoStoreType()).toBe(expectedStore)
        }
        // run the test with IndexedDB
        await run(new IndexedDBCryptoStore(indexedDB, `river-sdk:crypto:test`, 'alice'), 'Backend')
        // run the test with local storage
        await run(
            new IndexedDBCryptoStore(null, `river-sdk:crypto:test`, 'alice'),
            'LocalStorageCryptoStore',
        )
    })
})
