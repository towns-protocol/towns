/**
 * @group core
 */
import { TestConstants } from './helpers/TestConstants'
import { createTestSpaceGatedByTownNft, registerAndStartClients } from './helpers/TestUtils'
import { NoopRuleData, Permission } from '@river-build/web3'

// TODO: https://linear.app/hnt-labs/issue/HNT-5071/cannot-create-a-channel-when-the-default-member-role-has-the-addremove
describe('modifyDefaultRole', () => {
    test('BUG: create a space, add AddRemove channels to the default member role, joined user cannot create a channel', async () => {
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()

        // create a space with token entitlement to write
        const spaceId = await createTestSpaceGatedByTownNft(alice, [
            Permission.Read,
            Permission.Write,
        ])

        // add the AddRemoveChannels permission to the Member role
        // 1 is the Minter role
        // 2 is the member role
        const role = await alice.spaceDapp.getRole(spaceId, 2)

        expect(role).toBeDefined()

        const _r = role!
        const updatedRoleTx = await alice.updateRoleTransaction(
            spaceId,
            _r.id,
            _r.name,
            _r.permissions.concat([Permission.AddRemoveChannels]),
            _r.users,
            _r.ruleData,
            alice.wallet,
        )
        const updateRoleResult = await alice.waitForUpdateRoleTransaction(updatedRoleTx)
        expect(updateRoleResult.receipt?.status).toBe(1)
        const updatedRole = await alice.spaceDapp.getRole(spaceId, 2)
        expect(updatedRole?.permissions).toContain(Permission.AddRemoveChannels)

        const { bob } = await registerAndStartClients(['bob'])
        await bob.fundWallet()
        const join = await bob.joinTown(spaceId, bob.wallet)

        expect(join).toBeDefined()

        try {
            await bob.createChannel(
                {
                    name: 'test_channel',
                    parentSpaceId: spaceId,
                    roleIds: [2],
                },
                bob.provider.wallet,
            )
        } catch (error: unknown) {
            expect((error as Error).toString()).toMatch(
                /Entitlement__NotAllowed: execution reverted: custom error 338e692c/i,
            )
        }
    })

    test('create a space, create a new role with AddRemove channels, have a user join the town and create a channel', async () => {
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()

        // create a space with token entitlement to write
        const spaceId = await createTestSpaceGatedByTownNft(alice, [
            Permission.Read,
            Permission.Write,
        ])

        const createRoleTx = await alice.createRole(
            spaceId,
            'new_role',
            [Permission.AddRemoveChannels],
            [TestConstants.EveryoneAddress],
            NoopRuleData,
        )
        expect(createRoleTx).toBeDefined()
        const createdRole = await alice.spaceDapp.getRole(spaceId, 3)
        expect(createdRole?.permissions).toContain(Permission.AddRemoveChannels)

        const { bob } = await registerAndStartClients(['bob'])
        await bob.fundWallet()
        const join = await bob.joinTown(spaceId, bob.wallet)

        expect(join).toBeDefined()

        const channel = await bob.createChannel(
            {
                name: 'test_channel',
                parentSpaceId: spaceId,
                roleIds: [2],
            },
            bob.provider.wallet,
        )

        expect(channel).toBeDefined()
    })
})
