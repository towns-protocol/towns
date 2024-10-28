/**
 * @group with-entitlements
 */

import {
    makeUserContextFromWallet,
    makeTestClient,
    getDynamicPricingModule,
    createVersionedSpace,
} from './util.test'
import { makeDefaultChannelStreamId, makeSpaceStreamId } from './id'
import { ethers, Wallet } from 'ethers'
import { Client } from './client'
import {
    ETH_ADDRESS,
    LocalhostWeb3Provider,
    LegacyMembershipStruct,
    NoopRuleData,
    Permission,
    createSpaceDapp,
} from '@river-build/web3'
import { SignerContext } from './signerContext'
import { makeBaseChainConfig } from './riverConfig'
import { dlog } from '@river-build/dlog'

const log = dlog('csb:test:mediaWithEntitlements')

describe('mediaWithEntitlements', () => {
    let bobClient: Client
    let bobWallet: Wallet
    let bobContext: SignerContext

    let aliceClient: Client
    let aliceWallet: Wallet
    let aliceContext: SignerContext

    const baseConfig = makeBaseChainConfig()

    beforeEach(async () => {
        bobWallet = ethers.Wallet.createRandom()
        bobContext = await makeUserContextFromWallet(bobWallet)
        bobClient = await makeTestClient({ context: bobContext })

        aliceWallet = ethers.Wallet.createRandom()
        aliceContext = await makeUserContextFromWallet(aliceWallet)
        aliceClient = await makeTestClient({
            context: aliceContext,
        })
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

        const pricingModules = await spaceDapp.listPricingModules()
        const dynamicPricingModule = getDynamicPricingModule(pricingModules)
        expect(dynamicPricingModule).toBeDefined()

        // create a space stream,
        const membershipInfo: LegacyMembershipStruct = {
            settings: {
                name: 'Everyone',
                symbol: 'MEMBER',
                price: 0,
                maxSupply: 1000,
                duration: 0,
                currency: ETH_ADDRESS,
                feeRecipient: bobClient.userId,
                freeAllocation: 0,
                pricingModule: dynamicPricingModule!.module,
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
            bobClient.createMediaStream(channelId, spaceStreamId, undefined, 10),
        ).toResolve()
        await bobClient.stop()

        await aliceClient.initializeUser({ spaceId: space2Id })
        aliceClient.startSync()

        // Alice is NOT a member of the channel is prevented from creating a media stream
        await expect(
            aliceClient.createMediaStream(channelId, spaceStreamId, undefined, 10),
        ).toReject()
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

        const pricingModules = await spaceDapp.listPricingModules()
        const dynamicPricingModule = getDynamicPricingModule(pricingModules)
        expect(dynamicPricingModule).toBeDefined()

        // create a space stream,
        const membershipInfo: LegacyMembershipStruct = {
            settings: {
                name: 'Everyone',
                symbol: 'MEMBER',
                price: 0,
                maxSupply: 1000,
                duration: 0,
                currency: ETH_ADDRESS,
                feeRecipient: bobClient.userId,
                freeAllocation: 0,
                pricingModule: dynamicPricingModule!.module,
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
            bobClient.createMediaStream(undefined, undefined, bobClient.userId, 10),
        ).toResolve()
        await bobClient.stop()
    })
})
