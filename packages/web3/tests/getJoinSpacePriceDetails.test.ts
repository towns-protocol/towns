import { ethers } from 'ethers'
import { makeBaseChainConfig, makeSpaceStreamId } from '../../sdk'
import { LocalhostWeb3Provider } from '../src/LocalhostWeb3Provider'
import { SpaceDapp } from '../src/v3'
import { makeDefaultMembershipInfo } from './utils'
import { test, expect } from 'vitest'

test('getJoinSpacePriceDetails returns correct values for free space', async () => {
    const wallet = ethers.Wallet.createRandom()
    const config = makeBaseChainConfig()
    const baseProvider = new LocalhostWeb3Provider(config.rpcUrl, wallet)
    await baseProvider.fundWallet()
    const spaceDapp = new SpaceDapp(config.chainConfig, baseProvider)
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
    const config = makeBaseChainConfig()
    const baseProvider = new LocalhostWeb3Provider(config.rpcUrl, wallet)
    await baseProvider.fundWallet()
    const spaceDapp = new SpaceDapp(config.chainConfig, baseProvider)
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
    const spaceId = makeSpaceStreamId(spaceAddress)

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
