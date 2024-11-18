/**
 * @group core
 */
import { jest } from '@jest/globals'
import {
    registerAndStartClients,
    createTestSpaceGatedByTownsNfts,
    getFreeSpacePricingSetup,
} from './helpers/TestUtils'

import { MembershipStruct, EncodedNoopRuleData, Permission } from '@river-build/web3'
import { waitFor } from '@testing-library/dom'
import { ethers } from 'ethers'

test('should clear promise from promise queue after transaction resolves', async () => {
    // create clients
    // alice needs to have a valid nft in order to join bob's space / channel
    const { bob } = await registerAndStartClients(['bob'])
    // bob needs funds to create a space
    await bob.fundWallet()
    // bob creates a space
    await createTestSpaceGatedByTownsNfts(bob, [Permission.Read, Permission.Write])

    await waitFor(() =>
        // we retry createSpace in tests, so this could be more than 0
        expect(Object.keys(bob.blockchainTransactionStore.transactions).length).toBeGreaterThan(0),
    )

    expect(bob.blockchainTransactionStore.promiseQueue.length).toEqual(0)
})

test('should clear all promises when client stops', async () => {
    const { bob } = await registerAndStartClients(['bob'])
    // bob needs funds to create a space
    await bob.fundWallet()

    const _abortController = new AbortController()

    let infinitePromise: ReturnType<typeof bob.provider.waitForTransaction> | undefined

    jest.spyOn(bob.provider, 'waitForTransaction').mockImplementation(() => {
        infinitePromise = new Promise((resolve) => {
            // to cleanup this promise from within this test
            _abortController.signal.addEventListener('abort', () => {
                resolve(undefined as unknown as ReturnType<typeof bob.provider.waitForTransaction>)
            })

            // https://github.com/ethers-io/ethers.js/blob/master/packages/providers/src.ts/base-provider.ts#L1286
            bob.provider.once('block', () => {})
            // simulate long running transaction
            setTimeout(() => {
                resolve(undefined as unknown as ReturnType<typeof bob.provider.waitForTransaction>)
            }, Infinity)
        })
        return infinitePromise
    })

    const { fixedPricingModuleAddress, freeAllocation, price } = await getFreeSpacePricingSetup(
        bob.spaceDapp,
    )

    const blockchainStoreAbortSpy = jest.spyOn(
        bob.blockchainTransactionStore.abortController,
        'abort',
    )

    const membershipInfo: MembershipStruct = {
        settings: {
            name: 'Member',
            symbol: 'MEMBER',
            price,
            maxSupply: 100,
            duration: 0,
            currency: ethers.constants.AddressZero,
            feeRecipient: ethers.constants.AddressZero,
            freeAllocation,
            pricingModule: fixedPricingModuleAddress,
        },
        permissions: [],
        requirements: {
            ruleData: EncodedNoopRuleData,
            everyone: false,
            users: [],
            syncEntitlements: false,
        },
    }

    await bob.createSpaceTransaction(
        {
            name: bob.makeUniqueName(),
        },
        membershipInfo,
        bob.provider.wallet,
    )

    await waitFor(() =>
        // we retry createSpace in tests, so this could be more than 0
        expect(Object.keys(bob.blockchainTransactionStore.transactions).length).toBeGreaterThan(0),
    )

    expect(bob.provider.listenerCount()).toBeGreaterThan(0)
    expect(bob.blockchainTransactionStore.promiseQueue.length).toBeGreaterThan(0)
    expect(blockchainStoreAbortSpy).not.toHaveBeenCalled()

    await bob.stopClients()
    expect(bob.provider.listenerCount()).toEqual(0)
    expect(bob.blockchainTransactionStore.promiseQueue.length).toEqual(0)
    expect(blockchainStoreAbortSpy).toHaveBeenCalledTimes(1)

    // cleanup
    _abortController.abort()
    await expect(infinitePromise).resolves.toBeUndefined()
})
