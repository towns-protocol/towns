/**
 * @group with-entitlements
 */

import { dlog } from '@river-build/dlog'
import {
    makeUserContextFromWallet,
    createVersionedSpace,
    getFreeSpacePricingSetup,
} from './util.test'
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
    LegacyMembershipStruct,
    NoopRuleData,
    ETH_ADDRESS,
} from '@river-build/web3'
import { makeBaseChainConfig } from './riverConfig'

const log = dlog('csb:test:membershipManagement')

describe('membershipManagement', () => {
    test('anoint memberships', async () => {
        // make a space and mint some memberships for friends

        log('start')
        const baseConfig = makeBaseChainConfig()
        const bobsWallet = ethers.Wallet.createRandom()
        const bobsContext = await makeUserContextFromWallet(bobsWallet)
        const bobProvider = new LocalhostWeb3Provider(baseConfig.rpcUrl, bobsWallet)
        await bobProvider.fundWallet()
        const spaceDapp = createSpaceDapp(bobProvider, baseConfig.chainConfig)

        // create a user stream
        const { fixedPricingModuleAddress, freeAllocation, price } = await getFreeSpacePricingSetup(
            spaceDapp,
        )

        // create a space stream,
        log('Bob created user, about to create space')
        // first on the blockchain
        const membershipInfo: LegacyMembershipStruct = {
            settings: {
                name: 'Everyone',
                symbol: 'MEMBER',
                price,
                maxSupply: 1000,
                duration: 0,
                currency: ETH_ADDRESS,
                feeRecipient: userIdFromAddress(bobsContext.creatorAddress),
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
                spaceName: 'bobs-space-metadata',
                uri: 'http://bobs-space-metadata.com',
                channelName: 'general', // default channel name
                membership: membershipInfo,
            },
            bobProvider.wallet,
        )
        const receipt = await transaction.wait()
        log('transaction receipt')
        expect(receipt.status).toEqual(1)
        const spaceAddress = spaceDapp.getSpaceAddress(receipt, bobProvider.wallet.address)
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
