/**
 * @group casablanca
 */

import { Permission } from '@river/web3'
import {
    createTestSpaceGatedByTownNft,
    createTestSpaceGatedByTownAndZionNfts,
    registerAndStartClients,
} from './helpers/TestUtils'

describe('ITownArchitect tests', () => {
    test('create a town with Everyone role', async () => {
        /* Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()

        /* Act */
        const townId = await createTestSpaceGatedByTownNft(alice, [
            Permission.Read,
            Permission.Write,
        ])

        /* Assert */
        expect(townId).toBeDefined()
    })

    test('create a town with token-gated member role', async () => {
        /* Arrange */
        const permissions: Permission[] = [Permission.Read, Permission.Write]
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()

        /* Act */
        const townId = await createTestSpaceGatedByTownAndZionNfts(alice, permissions)

        /* Assert */
        expect(townId).toBeDefined()
    })
})
