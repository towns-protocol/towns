import { Permission } from '../../src/client/web3/ContractTypes'
import {
    createTestSpaceWithEveryoneRole,
    createTestSpaceWithZionMemberRole,
    registerAndStartClients,
} from './helpers/TestUtils'

describe.skip('ITownArchitect tests', () => {
    test('create a town with Everyone role', async () => {
        /* Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()

        /* Act */
        const townId = await createTestSpaceWithEveryoneRole(alice)

        /* Assert */
        expect(townId).toBeDefined()
    })

    test('create a town with token-gated member role', async () => {
        /* Arrange */
        const permissions: Permission[] = [Permission.Read, Permission.Write]
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()

        /* Act */
        const townId = await createTestSpaceWithZionMemberRole(alice, permissions)

        /* Assert */
        expect(townId).toBeDefined()
    })
})
