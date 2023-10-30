/**
 * @group with-entitilements
 */

import { SignerContext } from './sign'
import { LocalhostWeb3Provider, ITownArchitectBase, Permission, SpaceDappV3 } from '@river/web3'
import {
    makeRandomUserContextWithOldDelegate,
    makeTestClient,
    TEST_URL_WITH_ENTITILEMENTS,
} from './util.test'
import { genId, makeChannelStreamId, makeSpaceStreamId } from './id'
import { ethers, Wallet } from 'ethers'
import { Client } from './client'
const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

describe('mediaWithEntitlementsTests', () => {
    let bobClient: Client
    let bobWallet: Wallet
    let bobContext: SignerContext

    let aliceClient: Client
    let aliceWallet: Wallet
    let aliceContext: SignerContext

    beforeEach(async () => {
        bobWallet = ethers.Wallet.createRandom()
        bobContext = await makeRandomUserContextWithOldDelegate(bobWallet)
        bobContext.deviceId = 'bobs-device-id'
        bobClient = await makeTestClient(TEST_URL_WITH_ENTITILEMENTS, bobContext)

        await bobClient.createNewUser()
        await bobClient.initCrypto()
        await bobClient.startSync()

        aliceWallet = ethers.Wallet.createRandom()
        aliceContext = await makeRandomUserContextWithOldDelegate(aliceWallet)
        aliceContext.deviceId = 'alices-device-id'

        aliceClient = await makeTestClient(TEST_URL_WITH_ENTITILEMENTS, aliceContext)
    })

    test('clientCanOnlyCreateMediaStreamIfMemberOfSpaceAndChannel', async () => {
        /**
         * Setup
         * Bob creates a space and a channel, both on chain and in River
         */

        const spaceStreamId = makeSpaceStreamId('bobs-space-' + genId())
        const channelId = makeChannelStreamId('bobs-channel-' + genId())

        const provider = new LocalhostWeb3Provider(bobWallet)
        const chainId = (await provider.getNetwork()).chainId
        await provider.fundWallet()
        await provider.mintMockNFT()
        const spaceDapp = new SpaceDappV3(chainId, provider)

        // create a space stream,
        const membershipInfo: ITownArchitectBase.MembershipStruct = {
            settings: {
                name: 'Everyone',
                symbol: 'MEMBER',
                price: 0,
                limit: 1000,
                duration: 0,
                currency: ETH_ADDRESS,
                feeRecipient: bobClient.userId,
            },
            permissions: [Permission.Read, Permission.Write],
            requirements: {
                everyone: true,
                tokens: [],
                users: [],
            },
        }

        const transaction = await spaceDapp.createSpace(
            {
                spaceId: spaceStreamId,
                spaceName: spaceStreamId,
                spaceMetadata: 'bobs-space-metadata',
                channelId: channelId,
                channelName: 'general', // default channel name
                membership: membershipInfo,
            },
            provider.wallet,
        )

        await transaction.wait()
        await bobClient.createSpace(spaceStreamId)
        await bobClient.createChannel(spaceStreamId, 'Channel', 'Topic', channelId)

        /**
         * Real test starts here
         * Bob is a member of the channel and can therefore create a media stream
         */
        await expect(bobClient.createMediaStream(channelId, 10)).toResolve()
        await bobClient.stop()

        await aliceClient.createNewUser()
        await aliceClient.initCrypto()
        await aliceClient.startSync()

        // Alice is NOT a member of the channel is prevented from creating a media stream
        await expect(aliceClient.createMediaStream(channelId, 10)).toReject()
        await aliceClient.stop()
    })
})
