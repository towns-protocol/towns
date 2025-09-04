import { ethers } from 'ethers'
import { LocalhostWeb3Provider } from '../src/test-helpers/LocalhostWeb3Provider'
import { SpaceDapp } from '../src/space-dapp/SpaceDapp'
import { makeDefaultMembershipInfo } from '../src/test-helpers/utils'
import { SpaceIdFromSpaceAddress } from '../src/utils/ut'

import DeploymentsJson from '@towns-protocol/generated/config/deployments.json'
import { BaseChainConfig } from '../src/utils/IStaticContractsInfo'
import { expect, test } from 'vitest'
// temp until there's a better way to do this without importing sdk
// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
const base = DeploymentsJson?.local_dev?.base as BaseChainConfig

if (!base) {
    throw new Error('getJoinSpacePriceDetails.test.ts: Base config not found')
}

const baseRpcUrl = process.env.BASE_CHAIN_RPC_URL!
const baseConfig = {
    chainId: base.chainId,
    addresses: {
        baseRegistry: base.addresses.baseRegistry,
        spaceFactory: base.addresses.spaceFactory,
        spaceOwner: base.addresses.spaceOwner,
        utils: {
            mockNFT: base.addresses.utils.mockNFT,
            member: base.addresses.utils.member,
        },
    },
}

test('getJoinSpacePriceDetails returns correct values for free space', async () => {
    const wallet = ethers.Wallet.createRandom()
    const baseProvider = new LocalhostWeb3Provider(baseRpcUrl, wallet)
    await baseProvider.fundWallet()
    const spaceDapp = new SpaceDapp(baseConfig, baseProvider)
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

    const priceDetails = await spaceDapp.getJoinSpacePriceDetails(spaceAddress)
    expect(priceDetails.price.toBigInt()).toBe(0n)
    expect(priceDetails.prepaidSupply.toBigInt()).toBe(0n)
    expect(priceDetails.remainingFreeSupply.toBigInt()).toBe(999n)
})

test('getJoinSpacePriceDetails returns correct values for paid space', async () => {
    const wallet = ethers.Wallet.createRandom()
    const baseProvider = new LocalhostWeb3Provider(baseRpcUrl, wallet)
    await baseProvider.fundWallet()
    const spaceDapp = new SpaceDapp(baseConfig, baseProvider)
    const price = ethers.utils.parseEther('1')
    const tx = await spaceDapp.createSpace(
        {
            spaceName: 'test',
            uri: '',
            channelName: 'test',
            membership: await makeDefaultMembershipInfo(
                spaceDapp,
                wallet.address,
                'fixed',
                price.toBigInt(),
                0,
            ),
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
    const spaceId = SpaceIdFromSpaceAddress(spaceAddress)

    const priceDetails = await spaceDapp.getJoinSpacePriceDetails(spaceAddress)

    expect(priceDetails.price.toBigInt()).toBe(price.toBigInt())
    expect(priceDetails.prepaidSupply.toBigInt()).toBe(0n)
    expect(priceDetails.remainingFreeSupply.toBigInt()).toBe(0n)

    const prepaidTx = await spaceDapp.prepayMembership(spaceId, 1, baseProvider.signer)
    await prepaidTx.wait()
    const prepaidSupply = await spaceDapp.getPrepaidMembershipSupply(spaceAddress)
    expect(prepaidSupply.toBigInt()).toBe(1n)

    const priceDetails2 = await spaceDapp.getJoinSpacePriceDetails(spaceAddress)

    expect(priceDetails2.price.toBigInt()).toBe(0n)
    expect(priceDetails2.prepaidSupply.toBigInt()).toBe(1n)
    expect(priceDetails2.remainingFreeSupply.toBigInt()).toBe(1n)
})
