/**
 * @group with-entitlements
 */

import {
    makeTestClient,
    createVersionedSpace,
    getFreeSpacePricingSetup,
    TestClient,
} from '../testUtils'
import { makeDefaultChannelStreamId, makeSpaceStreamId } from '../../id'
import { ethers } from 'ethers'
import {
    ETH_ADDRESS,
    LocalhostWeb3Provider,
    LegacyMembershipStruct,
    NoopRuleData,
    Permission,
    createSpaceDapp,
} from '@towns-protocol/web3'
import { makeBaseChainConfig } from '../../riverConfig'
import { dlog } from '@towns-protocol/dlog'

const log = dlog('csb:test:mediaWithEntitlements')

describe('mediaWithEntitlements', () => {
    let bobClient: TestClient
    let bobWallet: ethers.Wallet

    let aliceClient: TestClient

    const baseConfig = makeBaseChainConfig()

    beforeEach(async () => {
        bobClient = await makeTestClient()
        bobWallet = bobClient.wallet

        aliceClient = await makeTestClient()
    })

    afterEach(async () => {
        await bobClient.stop()
        await aliceClient.stop()
    })

    test('clientCanOnlyCreateMediaStreamIfMemberOfSpaceAndChannel', async () => {
        log('start clientCanOnlyCreateMediaStreamIfMemberOfSpaceAndChannel')
        /**
         * Setup
         * Bob creates a space and a channel, both on chain and in River
         */

        const provider = new LocalhostWeb3Provider(baseConfig.rpcUrl, bobWallet)
        await provider.fundWallet()
        const spaceDapp = createSpaceDapp(provider, baseConfig.chainConfig)

        const { fixedPricingModuleAddress, freeAllocation, price } =
            await getFreeSpacePricingSetup(spaceDapp)
        // create a space stream,
        const membershipInfo: LegacyMembershipStruct = {
            settings: {
                name: 'Everyone',
                symbol: 'MEMBER',
                price,
                maxSupply: 1000,
                duration: 0,
                currency: ETH_ADDRESS,
                feeRecipient: bobClient.userId,
                freeAllocation,
                pricingModule: fixedPricingModuleAddress,
            },
            permissions: [Permission.Read, Permission.Write],
            requirements: {
                everyone: true,
                users: [],
                ruleData: NoopRuleData,
                syncEntitlements: false,
            },
        }

        log('transaction start bob creating space')
        const transaction = await createVersionedSpace(
            spaceDapp,
            {
                spaceName: 'space-name',
                uri: 'http://bobs-space-metadata.com',
                channelName: 'general', // default channel name
                membership: membershipInfo,
            },
            provider.wallet,
        )

        const receipt = await transaction.wait()
        log('transaction receipt', receipt)
        const spaceAddress = spaceDapp.getSpaceAddress(receipt, provider.wallet.address)
        expect(spaceAddress).toBeDefined()
        const spaceStreamId = makeSpaceStreamId(spaceAddress!)
        const channelId = makeDefaultChannelStreamId(spaceAddress!)
        // join alice to the space so she can start up a client

        await bobClient.initializeUser({ spaceId: spaceStreamId })
        bobClient.startSync()
        await bobClient.createSpace(spaceStreamId)
        await bobClient.createChannel(spaceStreamId, 'Channel', 'Topic', channelId)

        // create a second space and join alice so she can start up a client
        const transaction2 = await createVersionedSpace(
            spaceDapp,
            {
                spaceName: 'space2',
                uri: 'bobs-space2-metadata',
                channelName: 'general2', // default channel name
                membership: membershipInfo,
            },
            provider.wallet,
        )
        const receipt2 = await transaction2.wait()
        log('transaction2 receipt', receipt2)
        const space2Address = spaceDapp.getSpaceAddress(receipt, provider.wallet.address)
        expect(space2Address).toBeDefined()
        const space2Id = makeSpaceStreamId(space2Address!)
        await spaceDapp.joinSpace(space2Id, aliceClient.userId, provider.wallet)

        /**
         * Real test starts here
         * Bob is a member of the channel and can therefore create a media stream
         */
        await expect(
            bobClient.createMediaStream(channelId, spaceStreamId, undefined, 5),
        ).resolves.not.toThrow()
        await bobClient.stop()

        await aliceClient.initializeUser({ spaceId: space2Id })
        aliceClient.startSync()

        // Alice is NOT a member of the channel is prevented from creating a media stream
        await expect(
            aliceClient.createMediaStream(channelId, spaceStreamId, undefined, 5),
        ).rejects.toThrow()
        await aliceClient.stop()
    })

    test('can create user media stream with user id only', async () => {
        log('start clientCanCreateUserMediaStream')
        /**
         * Setup
         * Bob creates a space, both on chain and in River, in order to initialize the user
         */

        const provider = new LocalhostWeb3Provider(baseConfig.rpcUrl, bobWallet)
        await provider.fundWallet()
        const spaceDapp = createSpaceDapp(provider, baseConfig.chainConfig)

        const { fixedPricingModuleAddress, freeAllocation, price } =
            await getFreeSpacePricingSetup(spaceDapp)

        // create a space stream,
        const membershipInfo: LegacyMembershipStruct = {
            settings: {
                name: 'Everyone',
                symbol: 'MEMBER',
                price,
                maxSupply: 1000,
                duration: 0,
                currency: ETH_ADDRESS,
                feeRecipient: bobClient.userId,
                freeAllocation,
                pricingModule: fixedPricingModuleAddress,
            },
            permissions: [Permission.Read, Permission.Write],
            requirements: {
                everyone: true,
                users: [],
                ruleData: NoopRuleData,
                syncEntitlements: false,
            },
        }

        log('transaction start bob creating space')
        const transaction = await createVersionedSpace(
            spaceDapp,
            {
                spaceName: 'space-name',
                uri: 'http://bobs-space-metadata.com',
                channelName: 'general', // default channel name
                membership: membershipInfo,
            },
            provider.wallet,
        )

        const receipt = await transaction.wait()
        log('transaction receipt', receipt)
        const spaceAddress = spaceDapp.getSpaceAddress(receipt, provider.wallet.address)
        expect(spaceAddress).toBeDefined()
        const spaceStreamId = makeSpaceStreamId(spaceAddress!)
        await bobClient.initializeUser({ spaceId: spaceStreamId })
        bobClient.startSync()
        await bobClient.createSpace(spaceStreamId)
        /**
         * Real test starts here
         * Bob creates a user media stream
         */
        await expect(
            bobClient.createMediaStream(undefined, undefined, bobClient.userId, 5),
        ).resolves.not.toThrow()
        await bobClient.stop()
    })
})
