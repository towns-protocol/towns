import { Permission } from '../../src/client/web3/ContractTypes'
import {
    createTestSpaceWithEveryoneRole,
    createTestSpaceWithZionMemberRole,
    registerAndStartClients,
} from './helpers/TestUtils'
import { ZionTestClientProps } from './helpers/ZionTestClient'

describe.skip('ITownArchitect tests', () => {
    const withV3Props: ZionTestClientProps = {
        smartContractVersion: 'v3', // use v3 for the new TownArchitect. work-in-progress.
    }

    test('create a town with Everyone role', async () => {
        /* Arrange */
        const { alice } = await registerAndStartClients(['alice'], withV3Props)
        await alice.fundWallet()

        /* Act */
        const townId = await createTestSpaceWithEveryoneRole(alice)

        /* Assert */
        expect(townId).toBeDefined()
    })

    test('create a town with token-gated member role', async () => {
        /* Arrange */
        const permissions: Permission[] = [Permission.Read, Permission.Write]
        const { alice } = await registerAndStartClients(['alice'], withV3Props)
        await alice.fundWallet()

        /* Act */
        const townId = await createTestSpaceWithZionMemberRole(alice, permissions)

        /* Assert */
        expect(townId).toBeDefined()
    })
})
