import { LocalhostWeb3Provider } from '@river-build/web3'
import { Permission } from '@river-build/web3'
import {
    createSpaceDappAndUserops,
    createUngatedSpace,
    generatePrivyWalletIfKey,
    getSpaceId,
    sleepBetweenTxs,
    waitForOpAndTx,
} from './utils'

const ogName = 'test_space'
const newName = 'new_name'

test('can update a space (name) via userop', async () => {
    const bob = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )
    await bob.ready

    const { spaceDapp, userOps } = createSpaceDappAndUserops(bob)

    const op = await createUngatedSpace({
        userOps,
        spaceDapp,
        signer: bob.wallet,
        rolePermissions: [Permission.Read, Permission.Write],
        spaceName: ogName,
    })
    const receipt = await waitForOpAndTx(op, bob)
    const spaceId = getSpaceId(spaceDapp, receipt)
    expect(spaceId).toBeDefined()

    const town = spaceDapp.getSpace(spaceId!)

    expect((await town?.getSpaceInfo())?.name).toBe(ogName)

    const updateSpaceOp = await userOps.sendUpdateSpaceNameOp([spaceId, newName, bob.wallet])
    await waitForOpAndTx(updateSpaceOp, bob)
    await sleepBetweenTxs()

    expect((await town?.getSpaceInfo())?.name).toBe(newName)
})
