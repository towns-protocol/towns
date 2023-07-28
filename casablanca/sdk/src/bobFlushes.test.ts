/**
 * @group node-minipool-flush
 */

import { bobTalksToHimself } from './bob.test_util'
import { dlog } from './dlog'
import { SignerContext } from './sign'
import { makeRandomUserContext } from './util.test'

const baseLog = dlog('csb:test:bobFlushes')

describe.skip('bobFlushes', () => {
    let bobsContext: SignerContext

    beforeEach(async () => {
        bobsContext = await makeRandomUserContext()
    })

    test.each([
        ['bobTalksToHimself-flush-nopresync', false],
        ['bobTalksToHimself-flush-presync', true],
    ])('%s', async (name: string, presync: boolean) => {
        await bobTalksToHimself(baseLog.extend(name), bobsContext, false, presync)
    })
})
