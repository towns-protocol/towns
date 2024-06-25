import { Permission } from '@river-build/web3'
import { createPaidTestSpaceGatedByTownNft, registerAndStartClients } from './helpers/TestUtils'
import { assert } from 'console'
import { TransactionStatus } from '../../src/client/TownsClientTypes'

/**
 * @group core
 */
test('create a space with a fixed cost, buy prepaid seats', async () => {
    const { bob } = await registerAndStartClients(['bob'])

    const spaceId = await createPaidTestSpaceGatedByTownNft(bob, [
        Permission.Read,
        Permission.Write,
    ])

    const spaceInfo = await bob.spaceDapp.getMembershipInfo(spaceId)
    assert(spaceInfo !== undefined, 'spaceInfo undefined')

    expect((await bob.spaceDapp.getPrepaidMembershipSupply(spaceId)).toNumber()).toEqual(0)

    // bob buys 1 prepaid seat
    const prepayTx = await bob.prepayMembershipTransaction(spaceId, 1, bob.wallet)
    const receipt = await bob.waitForPrepayMembershipTransaction(prepayTx)
    expect(receipt.status).toEqual(TransactionStatus.Success)

    expect((await bob.spaceDapp.getPrepaidMembershipSupply(spaceId)).toNumber()).toEqual(1)

    // bob buys additional prepaid seats
    const prepayTx2 = await bob.prepayMembershipTransaction(spaceId, 5, bob.wallet)
    const receipt2 = await bob.waitForPrepayMembershipTransaction(prepayTx2)
    expect(receipt2.status).toEqual(TransactionStatus.Success)

    expect((await bob.spaceDapp.getPrepaidMembershipSupply(spaceId)).toNumber()).toEqual(6)
})
