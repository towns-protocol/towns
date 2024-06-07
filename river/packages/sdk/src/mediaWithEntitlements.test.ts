/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/**
 * @group with-entitilements
 */

import { makeUserContextFromWallet, makeTestClient, getDynamicPricingModule } from './util.test'
import { makeDefaultChannelStreamId, makeSpaceStreamId } from './id'
import { ethers, Wallet } from 'ethers'
import { Client } from './client'
import {
    ETH_ADDRESS,
    LocalhostWeb3Provider,
    MembershipStruct,
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
        const membershipInfo: MembershipStruct = {
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
            },
        }

        log('transaction start bob creating space')
        const transaction = await spaceDapp.createSpace(
            {
                spaceName: 'space-name',
                spaceMetadata: 'bobs-space-metadata',
                channelName: 'general', // default channel name
                membership: membershipInfo,
            },
            provider.wallet,
        )

        const receipt = await transaction.wait()
        log('transaction receipt', receipt)
        const spaceAddress = spaceDapp.getSpaceAddress(receipt)
        expect(spaceAddress).toBeDefined()
        const spaceStreamId = makeSpaceStreamId(spaceAddress!)
        const channelId = makeDefaultChannelStreamId(spaceAddress!)
        // join alice to the space so she can start up a client

        await bobClient.initializeUser({ spaceId: spaceStreamId })
        bobClient.startSync()
        await bobClient.createSpace(spaceStreamId)
        await bobClient.createChannel(spaceStreamId, 'Channel', 'Topic', channelId)

        // create a second space and join alice so she can start up a client
        const transaction2 = await spaceDapp.createSpace(
            {
                spaceName: 'space2',
                spaceMetadata: 'bobs-space2-metadata',
                channelName: 'general2', // default channel name
                membership: membershipInfo,
            },
            provider.wallet,
        )
        const receipt2 = await transaction2.wait()
        log('transaction2 receipt', receipt2)
        const space2Address = spaceDapp.getSpaceAddress(receipt)
        expect(space2Address).toBeDefined()
        const space2Id = makeSpaceStreamId(space2Address!)
        await spaceDapp.joinSpace(space2Id, aliceClient.userId, provider.wallet)

        /**
         * Real test starts here
         * Bob is a member of the channel and can therefore create a media stream
         */
        await expect(bobClient.createMediaStream(channelId, spaceStreamId, 10)).toResolve()
        await bobClient.stop()

        await aliceClient.initializeUser({ spaceId: space2Id })
        aliceClient.startSync()

        // Alice is NOT a member of the channel is prevented from creating a media stream
        await expect(aliceClient.createMediaStream(channelId, spaceStreamId, 10)).toReject()
        await aliceClient.stop()
    })
})
