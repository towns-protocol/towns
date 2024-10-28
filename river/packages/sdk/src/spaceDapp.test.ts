/**
 * @group with-entitlements
 */

import { dlog } from '@river-build/dlog'
import { makeSpaceStreamId } from './id'
import { makeRiverConfig } from './riverConfig'
import { LocalhostWeb3Provider, SpaceDapp } from '@river-build/web3'
import { ethers } from 'ethers'
import { makeDefaultMembershipInfo } from './sync-agent/utils/spaceUtils'

const log = dlog('csb:test:spaceDapp')

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
})
