/**
 * @group rk
 */

import { bin_toHexString } from '../binary'
import { dlog } from '../dlog'
import { RK, RDK } from './rk'

const log = dlog('rk')

describe('rk', () => {
    const rk = RK.createRandom()
    const rdk0 = RDK.createRandom()

    test('signRdk', async () => {
        const sig = await rk.signRdk(rdk0)
        log('sig', bin_toHexString(sig), 'pub', rdk0.publicKey())
        expect(sig.length).toBe(65)
        // verify
        const recovered = rk.verifyRdk(rdk0)
        expect(recovered).toBe(true)
    })

    test('restoreKey', async () => {
        const sig0 = await rk.signRdk(rdk0)
        const rk1 = new RK(rk.privateKey())
        const sig1 = await rk1.signRdk(rdk0)

        expect(sig0).toEqual(sig1)
    })
})
