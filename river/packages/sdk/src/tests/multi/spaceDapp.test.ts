/**
 * @group with-entitlements
 */

import { dlog } from '@river-build/dlog'
import { makeSpaceStreamId } from '../../id'
import { makeBaseChainConfig, makeRiverConfig } from '../../riverConfig'
import { createSpaceDapp, LocalhostWeb3Provider, SpaceDapp } from '@river-build/web3'
import { ethers } from 'ethers'
import { makeDefaultMembershipInfo } from '../../sync-agent/utils/spaceUtils'
import { linkWallets, unlinkCaller } from '../testUtils'

const log = dlog('test:spaceDapp')

describe('spaceDappTests', () => {
    test('spaceDapp URI', async () => {
        log('spaceDapp URI')
        const wallet = ethers.Wallet.createRandom()
        const wallet2 = ethers.Wallet.createRandom()
        const config = makeRiverConfig()
        const baseProvider = new LocalhostWeb3Provider(config.base.rpcUrl, wallet)
        await baseProvider.fundWallet()
        const spaceDapp = new SpaceDapp(config.base.chainConfig, baseProvider)
        const tx = await spaceDapp.createSpace(
            {
                spaceName: 'test',
                uri: '',
                channelName: 'test',
                membership: await makeDefaultMembershipInfo(spaceDapp, wallet.address),
                shortDescription: 'test',
                longDescription: 'test',
            },
            baseProvider.signer,
        )
        const receipt = await tx.wait()
        const spaceAddress = spaceDapp.getSpaceAddress(receipt, baseProvider.wallet.address)
        if (!spaceAddress) {
            throw new Error('Space address not found')
        }
        const spaceId = makeSpaceStreamId(spaceAddress)
        const membership2 = await spaceDapp.joinSpace(spaceId, wallet2.address, baseProvider.signer)
        if (!membership2.tokenId) {
            throw new Error('tokenId not found')
        }

        const uri = await spaceDapp.tokenURI(spaceId)
        expect(uri).toBe(`http://localhost:3002/${spaceAddress}`) // hardcoded in InteractSetDefaultUriLocalhost.s.sol

        const memberURI = await spaceDapp.memberTokenURI(spaceId, membership2.tokenId)
        expect(memberURI).toBe(`http://localhost:3002/${spaceAddress}/token/${membership2.tokenId}`) // hardcoded in InteractSetDefaultUriLocalhost.s.sol
    })

    test('remove caller link', async () => {
        const baseConfig = makeBaseChainConfig()

        const rootProvider = new LocalhostWeb3Provider(
            baseConfig.rpcUrl,
            ethers.Wallet.createRandom(),
        )
        const linkedProvider = new LocalhostWeb3Provider(
            baseConfig.rpcUrl,
            ethers.Wallet.createRandom(),
        )
        await Promise.all([rootProvider.fundWallet(), linkedProvider.fundWallet()])
        const spaceDapp = createSpaceDapp(rootProvider, baseConfig.chainConfig)

        await linkWallets(spaceDapp, rootProvider.wallet, linkedProvider.wallet)
        const linkedWallets = await spaceDapp.walletLink.getLinkedWallets(
            rootProvider.wallet.address,
        )
        expect(linkedWallets.length).toBe(1)
        expect(linkedWallets[0]).toBe(linkedProvider.wallet.address)

        await unlinkCaller(spaceDapp, rootProvider.wallet, linkedProvider.wallet)
        const linkedWalletsAfter = await spaceDapp.walletLink.getLinkedWallets(
            rootProvider.wallet.address,
        )
        expect(linkedWalletsAfter.length).toBe(0)
    })
})
