/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group dendrite
 * @group casablanca
 */
import { CONTRACT_ERROR, NoThrownError, getError } from './helpers/ErrorUtils'
import {
    createTestSpaceGatedByTownAndZionNfts,
    registerAndStartClients,
} from 'use-zion-client/tests/integration/helpers/TestUtils'

import { Permission } from '@river/web3'

// https://linear.app/hnt-labs/issue/HNT-2046/testsintegrationpermissionsdisablespaceorchanneltestts
describe.skip('disable channel', () => {
    test('Space owner is allowed to disable space access', async () => {
        /** Arrange */

        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()

        const roomId = await createTestSpaceGatedByTownAndZionNfts(alice, [Permission.Read])
        const spaceNetworkId: string | undefined = roomId?.networkId
        /** Act */
        // set space access off, disabling space in ZionSpaceManager
        const success: boolean | undefined = await alice.setSpaceAccess(
            spaceNetworkId as string,
            true,
            alice.provider.wallet,
        )

        const spaceInfo = await alice.getSpaceInfoBySpaceId(spaceNetworkId as string)

        /** Assert */
        expect(success).toEqual(true)
        expect(spaceInfo?.disabled).toEqual(true)
        expect(spaceInfo?.networkId).toEqual(spaceNetworkId)
    })

    test('Space owner is allowed to re-enable disabled space access', async () => {
        /** Arrange */

        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()

        const roomId = await createTestSpaceGatedByTownAndZionNfts(alice, [Permission.Read])
        if (!roomId) {
            throw new Error('roomId should be defined')
        }
        const spaceNetworkId = roomId.networkId
        /** Act */
        // set space access off, disabling space in ZionSpaceManager
        const disabled: boolean | undefined = await alice.setSpaceAccess(
            spaceNetworkId,
            true,
            alice.provider.wallet,
        )
        // set space access on, re-enabling space in ZionSpaceManager
        const enabled: boolean | undefined = await alice.setSpaceAccess(
            spaceNetworkId,
            false,
            alice.provider.wallet,
        )
        const spaceInfo = await alice.getSpaceInfoBySpaceId(spaceNetworkId)

        /** Assert */
        expect(disabled).toEqual(true)
        expect(enabled).toEqual(true)
        expect(spaceInfo?.disabled).toEqual(false)
        expect(spaceInfo?.networkId).toEqual(spaceNetworkId)
    })

    test('Space member is not allowed to disable space access', async () => {
        /** Arrange */

        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        await alice.fundWallet()
        await bob.fundWallet()

        const roomId = await createTestSpaceGatedByTownAndZionNfts(alice, [Permission.Read])
        const spaceNetworkId: string | undefined = roomId?.networkId
        /** Act */
        // set space access off, disabling space in ZionSpaceManager
        const error = await getError<Error>(async function () {
            await bob.setSpaceAccess(spaceNetworkId as string, true, bob.provider.wallet)
        })

        /* Assert */
        // check that the returned error wasn't that no error was thrown.
        expect(error).not.toBeInstanceOf(NoThrownError)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(error).toHaveProperty('name')
        const regEx = new RegExp(`${CONTRACT_ERROR.NotAllowed}|${CONTRACT_ERROR.NotOwner}`)
        expect(error.name).toMatch(regEx)
    })
})
