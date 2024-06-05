import { EVERYONE_ADDRESS, LocalhostWeb3Provider, NoopRuleData } from '@river-build/web3'
import { Permission } from '@river-build/web3'
import {
    createSpaceDappAndUserops,
    createUngatedSpace,
    generatePrivyWalletIfKey,
    getSpaceId,
    sleepBetweenTxs,
    waitForOpAndTx,
} from './utils'

const ROLE_NAME = 'role_name'
const NEW_ROLE_NAME = 'new_role_name'

test('can create, update, and delete a role with user ops', async () => {
    const alice = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )
    await alice.ready

    const { spaceDapp, userOps } = createSpaceDappAndUserops(alice)

    const createSpaceOp = await createUngatedSpace({
        userOps,
        spaceDapp,
        signer: alice.wallet,
        rolePermissions: [Permission.Read, Permission.Write],
    })
    const txReceipt = await waitForOpAndTx(createSpaceOp, alice)
    await sleepBetweenTxs()

    const spaceId = await getSpaceId(spaceDapp, txReceipt)

    // create a role
    const createRoleOp = await userOps.sendCreateRoleOp([
        spaceId,
        ROLE_NAME,
        [],
        [EVERYONE_ADDRESS],
        NoopRuleData,
        alice.wallet,
    ])

    await waitForOpAndTx(createRoleOp, alice)
    await sleepBetweenTxs()

    let roles = await spaceDapp.getRoles(spaceId)
    // new role + default roles (member/minter)
    expect(roles).toHaveLength(3)
    let role = roles.find((r) => r.name === ROLE_NAME)
    expect(role).toBeDefined()

    // update role
    const updateRoleOp = await userOps.sendUpdateRoleOp([
        {
            spaceNetworkId: spaceId,
            roleId: role!.roleId,
            roleName: NEW_ROLE_NAME,
            permissions: [Permission.Read, Permission.Write],
            users: [EVERYONE_ADDRESS],
            ruleData: NoopRuleData,
        },
        alice.wallet,
    ])

    await waitForOpAndTx(updateRoleOp, alice)
    await sleepBetweenTxs()

    roles = await spaceDapp.getRoles(spaceId)
    role = roles.find((r) => r.name === NEW_ROLE_NAME)
    expect(role).toBeDefined()

    const updatedRole = await spaceDapp.getRole(spaceId!, role!.roleId)
    expect(updatedRole?.name).toBe(NEW_ROLE_NAME)
    expect(updatedRole?.permissions).toHaveLength(2)

    // delete role
    const deleteRoleOp = await userOps.sendDeleteRoleOp([spaceId, role!.roleId, alice.wallet])
    await waitForOpAndTx(deleteRoleOp, alice)
    await sleepBetweenTxs()

    const deletedRole = await spaceDapp.getRole(spaceId!, role!.roleId)
    expect(deletedRole).toBeNull()
})
