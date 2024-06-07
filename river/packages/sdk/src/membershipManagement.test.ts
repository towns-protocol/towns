/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/**
 * @group with-entitilements
 */

import { dlog } from '@river-build/dlog'
import { makeUserContextFromWallet, getDynamicPricingModule } from './util.test'
import {
    isValidStreamId,
    makeDefaultChannelStreamId,
    makeSpaceStreamId,
    userIdFromAddress,
} from './id'
import { ethers } from 'ethers'
import {
    LocalhostWeb3Provider,
    createSpaceDapp,
    Permission,
    MembershipStruct,
    NoopRuleData,
    ETH_ADDRESS,
} from '@river-build/web3'
import { makeBaseChainConfig } from './riverConfig'

const log = dlog('csb:test:membershipManagement')

describe('membershipManagement', () => {
    test('annoint memberships', async () => {
        // make a space and mint some memberships for friends

        log('start')
        const baseConfig = makeBaseChainConfig()
        const bobsWallet = ethers.Wallet.createRandom()
        const bobsContext = await makeUserContextFromWallet(bobsWallet)
        const bobProvider = new LocalhostWeb3Provider(baseConfig.rpcUrl, bobsWallet)
        await bobProvider.fundWallet()
        const spaceDapp = createSpaceDapp(bobProvider, baseConfig.chainConfig)

        // create a user stream
        const pricingModules = await spaceDapp.listPricingModules()
        const dynamicPricingModule = getDynamicPricingModule(pricingModules)
        expect(dynamicPricingModule).toBeDefined()

        // create a space stream,
        log('Bob created user, about to create space')
        // first on the blockchain
        const membershipInfo: MembershipStruct = {
            settings: {
                name: 'Everyone',
                symbol: 'MEMBER',
                price: 0,
                maxSupply: 1000,
                duration: 0,
                currency: ETH_ADDRESS,
                feeRecipient: userIdFromAddress(bobsContext.creatorAddress),
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
                spaceName: 'bobs-space-metadata',
                spaceMetadata: 'bobs-space-metadata',
                channelName: 'general', // default channel name
                membership: membershipInfo,
            },
            bobProvider.wallet,
        )
        const receipt = await transaction.wait()
        log('transaction receipt')
        expect(receipt.status).toEqual(1)
        const spaceAddress = spaceDapp.getSpaceAddress(receipt)
        expect(spaceAddress).toBeDefined()
        const spaceId = makeSpaceStreamId(spaceAddress!)
        expect(isValidStreamId(spaceId)).toBe(true)
        const channelId = makeDefaultChannelStreamId(spaceAddress!)
        expect(isValidStreamId(channelId)).toBe(true)
        log('created space', spaceId, channelId, spaceAddress)

        const bobsFriends = [
            ethers.Wallet.createRandom(),
            ethers.Wallet.createRandom(),
            ethers.Wallet.createRandom(),
        ]

        for (let i = 0; i < bobsFriends.length; i++) {
            const wallet = bobsFriends[i]
            log('minting membership for', i, wallet.address)
            const result = await spaceDapp.joinSpace(spaceId, wallet.address, bobProvider.wallet)
            log('minted membership', result)
        }
    })
})
