/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/**
 * @group with-entitilements
 */

import { makeUserContextFromWallet, makeTestClient, getDynamicPricingModule } from './util.test'
import { makeDefaultChannelStreamId, makeSpaceStreamId } from './id'
import { ethers, Wallet } from 'ethers'
import { Client } from './client'
import { jest } from '@jest/globals'
import { MembershipStruct, NoopRuleData } from '@river-build/web3'
import { SignerContext } from './signerContext'
import { makeBaseChainConfig } from './riverConfig'
import { dlog } from '@river-build/dlog'

const log = dlog('csb:test:mediaWithEntitlements')

// This is a temporary hack because importing viem via SpaceDapp causes a jest error
// specifically the code in ConvertersEntitlements.ts - decodeAbiParameters and encodeAbiParameters functions have an import that can't be found
// Need to use the new space dapp in an actual browser to see if this is a problem there too before digging in further
jest.unstable_mockModule('viem', async () => {
    return {
        BaseError: class extends Error {},
        hexToString: jest.fn(),
        encodeFunctionData: jest.fn(),
        decodeAbiParameters: jest.fn(),
        encodeAbiParameters: jest.fn(),
        parseAbiParameters: jest.fn(),
        zeroAddress: `0x${'0'.repeat(40)}`,
    }
})

const { LocalhostWeb3Provider, Permission, createSpaceDapp } = await import('@river-build/web3')
const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

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

        await bobClient.initializeUser()
        bobClient.startSync()

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

        await bobClient.createSpace(spaceStreamId)
        await bobClient.createChannel(spaceStreamId, 'Channel', 'Topic', channelId)

        /**
         * Real test starts here
         * Bob is a member of the channel and can therefore create a media stream
         */
        await expect(bobClient.createMediaStream(channelId, spaceStreamId, 10)).toResolve()
        await bobClient.stop()

        await aliceClient.initializeUser()
        aliceClient.startSync()

        // Alice is NOT a member of the channel is prevented from creating a media stream
        await expect(aliceClient.createMediaStream(channelId, spaceStreamId, 10)).toReject()
        await aliceClient.stop()
    })
})
