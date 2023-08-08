import { createTestSpaceWithEveryoneRole, registerAndStartClients } from './helpers/TestUtils'

describe('ITownArchitect tests', () => {
    test.skip('create a town with Everyone role', async () => {
        /* Arrange */
        const { alice } = await registerAndStartClients(['alice'], {
            smartContractVersion: 'v3', // use v3 for the new TownArchitect. work-in-progress.
        })
        await alice.fundWallet()

        /* Act */
        const townId = await createTestSpaceWithEveryoneRole(alice)

        /* Assert */
        expect(townId).toBeDefined()
    })
})
