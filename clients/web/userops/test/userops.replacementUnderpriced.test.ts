import { BundlerJsonRpcProvider, IUserOperation } from 'userop'
import { Address, LocalhostWeb3Provider } from '@river-build/web3'
import { Permission } from '@river-build/web3'
import {
    createSpaceDappAndUserops,
    createUngatedSpace,
    generatePrivyWalletIfKey,
    sleepBetweenTxs,
} from './utils'
import { expect, vi, test } from 'vitest'
import * as TownsUserOpClient from '../src/TownsUserOpClient'
import { selectUserOpsByAddress, userOpsStore } from '../src/userOpsStore'
import { MAX_MULTIPLIER } from '../src/middlewares/estimateGasFees'
import { Wallet, utils } from 'ethers'
import { bigIntMultiply, PaymasterProxyPostData } from '../src/middlewares'
import { BigNumber } from 'ethers'
import { TestUserOps } from './TestUserOps'
const provider = new BundlerJsonRpcProvider(process.env.AA_RPC_URL as string)

beforeEach(() => {
    vi.spyOn(TownsUserOpClient.TownsUserOpClient, 'createProvider').mockReturnValue(provider)
})

afterEach(() => {
    vi.clearAllMocks()
})

test(
    'a sponsored userop should be replaced',
    async () => {
        const alice = new LocalhostWeb3Provider(
            process.env.AA_RPC_URL as string,
            generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
        )
        await alice.ready

        const { spaceDapp, userOps: userOpsAlice } = await createSpaceDappAndUserops(alice)
        const userOpClient = await userOpsAlice.getUserOpClient()
        // set the wait timeout and interval to 0 so we don't wait for the userop to be mined
        userOpClient.setWaitTimeoutMs(1)
        userOpClient.setWaitIntervalMs(0)

        let aaAddress = await userOpsAlice.getAbstractAccountAddress({
            rootKeyAddress: alice.wallet.address as Address,
        })
        expect(aaAddress).toBeDefined()
        aaAddress = aaAddress!

        // create space userop
        const ogOpTx = await createUngatedSpace({
            userOps: userOpsAlice,
            spaceDapp,
            signer: alice.wallet,
            rolePermissions: [Permission.Read, Permission.Write],
        })

        const ogOp = selectUserOpsByAddress(aaAddress).current.op!

        expect(ogOp.maxFeePerGas).toBeDefined()
        expect(ogOp.maxPriorityFeePerGas).toBeDefined()

        // this should be null b/c we're not waiting for the userop to be mined
        expect(await ogOpTx.getUserOperationReceipt()).toBeNull()

        // const sendSpy = vi.spyOn(provider, 'send')
        const fetchSpy = vi.spyOn(global, 'fetch')

        // this is a very confusing test to perform.
        // - we use stackup services locally
        // - we use alchemy in production
        // - b/c of this, some userop middleware is either applied or skipped - i.e. the stackup paymaster requires gas fee estimates to be included in the user operation, or else it fails, but the alchemy paymaster fails with the inverse
        // - so the prime objective of this test is just to ensure that the paymaster is called with the correct gas overrides

        // see comment at end of test
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const sendSpy = vi.spyOn(provider, 'send')

        // this could fail or succeed
        // mostly it succeeds b/c actually the stackup paymaster seems to use the gas estimate provided to it! (it does not use gas overrides, it just passes along the gas estimate the payload provides)
        // this is not the same as alchemy, so i'm just ignoring the status
        let replacementOpTx: Awaited<ReturnType<typeof createUngatedSpace>> | undefined
        try {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            replacementOpTx = await createUngatedSpace({
                userOps: userOpsAlice,
                spaceDapp,
                signer: alice.wallet,
                rolePermissions: [Permission.Read, Permission.Write],
            })
        } catch (error) {
            //
        }

        // ensure that the userop was sent to the paymaster
        const sponsorUserOpCalls = fetchSpy.mock.calls.filter((call) =>
            (call[0] as string).includes('/api/sponsor-userop'),
        )
        expect(sponsorUserOpCalls.length).toBeGreaterThanOrEqual(1)

        // and that the op was sent to the payamster with gas overrides that are going to replace the old userop
        const hasExpectedGasOverrides = sponsorUserOpCalls.some((call) => {
            const requestBody = JSON.parse(call[1]!.body as string) as {
                data: PaymasterProxyPostData
            }
            const actualMaxFeePerGas = BigNumber.from(
                requestBody.data.gasOverrides?.maxFeePerGas,
            ).toBigInt()
            const actualMaxPriorityFeePerGas = BigNumber.from(
                requestBody.data.gasOverrides?.maxPriorityFeePerGas,
            ).toBigInt()

            const expectedMaxFeePerGas = bigIntMultiply(ogOp.maxFeePerGas, MAX_MULTIPLIER)
            const expectedMaxPriorityFeePerGas = bigIntMultiply(
                ogOp.maxPriorityFeePerGas,
                MAX_MULTIPLIER,
            )

            return (
                actualMaxFeePerGas === expectedMaxFeePerGas &&
                actualMaxPriorityFeePerGas === expectedMaxPriorityFeePerGas
            )
        })

        expect(hasExpectedGasOverrides).toBe(true)

        // // while the below passes, like i said it's stackup not alchemy, so this doesn't really indicate anything
        // // once we have local alchemy, this should always pass
        // //
        // const ethSendUserOperationCalls = sendSpy.mock.calls.filter((call) =>
        //     call[0].includes('eth_sendUserOperation'),
        // )
        // expect(ethSendUserOperationCalls.length).toBe(1)
        // const replacementSendUserOpCall = ethSendUserOperationCalls[0]
        // expect(replacementSendUserOpCall[1]).toBeDefined()
        //    const replacementOpParams = replacementSendUserOpCall[1][0] as IUserOperation
        // expect([
        //     BigNumber.from(replacementOpParams.maxFeePerGas).toBigInt(),
        //     BigNumber.from(replacementOpParams.maxPriorityFeePerGas).toBigInt(),
        // ]).toEqual([
        //     bigIntMultiply(ogOp.maxFeePerGas, MAX_MULTIPLIER),
        //     bigIntMultiply(ogOp.maxPriorityFeePerGas, MAX_MULTIPLIER),
        // ])
    },
    {
        retry: 3,
    },
)

test(
    'a non-sponsored userop should be replaced',
    async () => {
        const alice = new LocalhostWeb3Provider(
            process.env.AA_RPC_URL as string,
            generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
        )
        await alice.ready

        const { spaceDapp, userOps: userOpsAlice } = await createSpaceDappAndUserops(alice)
        const userOpClient = await userOpsAlice.getUserOpClient()
        // set the wait timeout and interval to 0 so we don't wait for the userop to be mined
        userOpClient.setWaitTimeoutMs(1)
        userOpClient.setWaitIntervalMs(0)
        const randomWallet = Wallet.createRandom().connect(spaceDapp.provider)
        const aaAddress = await fundAbstractAccount(alice, userOpsAlice)
        const ethToSend = utils.parseEther('0.1')

        // transfer eth is a simple op that will bypass the paymaster proxy middleware
        const ogOpTx = await userOpsAlice.sendTransferEthOp(
            { recipient: randomWallet.address, value: ethToSend },
            alice.wallet,
        )

        const ogOp = selectUserOpsByAddress(aaAddress).current.op!

        expect(ogOp.maxFeePerGas).toBeDefined()
        expect(ogOp.maxPriorityFeePerGas).toBeDefined()

        // this should be null b/c we're not waiting for the userop to be mined
        expect(await ogOpTx.getUserOperationReceipt()).toBeNull()

        const sendSpy = vi.spyOn(provider, 'send')

        // if the userop is sent w/ too low of a replacement fee, this would throw
        let replacementOpTx: Awaited<ReturnType<typeof userOpsAlice.sendTransferEthOp>> | undefined
        try {
            replacementOpTx = await userOpsAlice.sendTransferEthOp(
                { recipient: randomWallet.address, value: ethToSend },
                alice.wallet,
            )
        } catch (error) {
            // noop
            console.error(error)
        }
        expect(replacementOpTx).toBeDefined()
        expect(await ogOpTx.getUserOperationReceipt()).toBeNull()
        expect(await replacementOpTx!.getUserOperationReceipt()).toBeNull()
        const ethSendUserOperationCalls = sendSpy.mock.calls.filter((call) =>
            call[0].includes('eth_sendUserOperation'),
        )
        expect(ethSendUserOperationCalls.length).toBe(1)
        const replacementSendUserOpCall = ethSendUserOperationCalls[0]
        expect(replacementSendUserOpCall[1]).toBeDefined()
        const replacementOpParams = replacementSendUserOpCall[1][0] as IUserOperation

        expect(replacementOpParams.callData).toEqual(ogOp.callData)
        expect(replacementOpParams.initCode).toEqual(ogOp.initCode)
        expect(replacementOpParams.sender).toEqual(ogOp.sender)
        expect(replacementOpParams.nonce).toEqual(ogOp.nonce)

        // gas fees of the og op should be multiplied by the max multiplier
        expect([
            BigNumber.from(replacementOpParams.maxFeePerGas).toBigInt(),
            BigNumber.from(replacementOpParams.maxPriorityFeePerGas).toBigInt(),
        ]).toEqual([
            bigIntMultiply(ogOp.maxFeePerGas, MAX_MULTIPLIER),
            bigIntMultiply(ogOp.maxPriorityFeePerGas, MAX_MULTIPLIER),
        ])

        await sleepBetweenTxs(4_000)
        // the og op should have been dropped
        expect(await ogOpTx.getUserOperationReceipt()).toBeNull()
        // the replacement op should have succeeded
        expect((await replacementOpTx!.getUserOperationReceipt())?.userOpHash).toBeDefined()
    },
    {
        retry: 3,
    },
)

test(
    'when client loaded, a saved op in store should be replaced',
    async () => {
        const alice = new LocalhostWeb3Provider(
            process.env.AA_RPC_URL as string,
            generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
        )
        await alice.ready

        const { spaceDapp, userOps: userOpsAlice } = await createSpaceDappAndUserops(alice)
        const userOpClient = await userOpsAlice.getUserOpClient()
        // set the wait timeout and interval to 0 so we don't wait for the userop to be mined
        userOpClient.setWaitTimeoutMs(1)
        userOpClient.setWaitIntervalMs(0)

        const randomWallet = Wallet.createRandom().connect(spaceDapp.provider)
        const aaAddress = await fundAbstractAccount(alice, userOpsAlice)

        const storedOp = {
            callData: '0x',
            initCode: '0x',
            sender: aaAddress,
            nonce: 0,
            maxFeePerGas: '0x2540BE400',
            maxPriorityFeePerGas: '0x2540BE400',
            callGasLimit: 0,
            verificationGasLimit: 0,
            preVerificationGas: 0,
            paymasterAndData: '0x',
            signature: '0x',
        }

        userOpsStore.setState((state) => {
            state.userOps[aaAddress] ??= {
                retryDetails: undefined,
                rejectedSponsorshipReason: undefined,
                promptResponse: undefined,
                operationAttempt: 1,
                promptUser: false,
                current: {
                    op: undefined,
                    value: undefined,
                    decodedCallData: undefined,
                },
                pending: {
                    op: storedOp,
                    value: undefined,
                    decodedCallData: undefined,
                    hash: '0x33b63588947990068dbccfbdc679d684d36c7ace2840cc95763bbc122baf7efe',
                },
            }
        })

        const ethToSend = utils.parseEther('0.1')

        const sendSpy = vi.spyOn(provider, 'send')

        let replacementOpTx: Awaited<ReturnType<typeof userOpsAlice.sendTransferEthOp>> | undefined
        try {
            replacementOpTx = await userOpsAlice.sendTransferEthOp(
                { recipient: randomWallet.address, value: ethToSend },
                alice.wallet,
            )
        } catch (error) {
            // noop
            console.error(error)
        }
        expect(replacementOpTx).toBeDefined()
        expect(await replacementOpTx!.getUserOperationReceipt()).toBeNull()
        const ethSendUserOperationCalls = sendSpy.mock.calls.filter((call) =>
            call[0].includes('eth_sendUserOperation'),
        )
        expect(ethSendUserOperationCalls.length).toBe(1)
        const replacementSendUserOpCall = ethSendUserOperationCalls[0]
        expect(replacementSendUserOpCall[1]).toBeDefined()
        const replacementOpParams = replacementSendUserOpCall[1][0] as IUserOperation

        // gas fees of the og op should be multiplied by the max multiplier
        expect([
            BigNumber.from(replacementOpParams.maxFeePerGas).toBigInt(),
            BigNumber.from(replacementOpParams.maxPriorityFeePerGas).toBigInt(),
        ]).toEqual([
            bigIntMultiply(storedOp.maxFeePerGas, MAX_MULTIPLIER),
            bigIntMultiply(storedOp.maxPriorityFeePerGas, MAX_MULTIPLIER),
        ])

        await sleepBetweenTxs(2_000)

        expect((await replacementOpTx!.getUserOperationReceipt())?.userOpHash).toBeDefined()

        const freshOp = await userOpsAlice.sendTransferEthOp(
            { recipient: randomWallet.address, value: ethToSend },
            alice.wallet,
        )
        await sleepBetweenTxs(2_000)
        expect(await freshOp.getUserOperationReceipt()).toBeDefined()
    },
    {
        retry: 3,
    },
)

test(
    'a userop that uses [execute] and fails to get a receipt within the timeout should be replaced',
    async () => {
        const alice = new LocalhostWeb3Provider(
            process.env.AA_RPC_URL as string,
            generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
        )
        await alice.ready

        const { spaceDapp, userOps: userOpsAlice } = await createSpaceDappAndUserops(alice)
        const aaAddress = await fundAbstractAccount(alice, userOpsAlice)
        const userOpClient = await userOpsAlice.getUserOpClient()
        // set the wait timeout and interval to 0 so we don't wait for the userop to be mined
        userOpClient.setWaitTimeoutMs(1)
        userOpClient.setWaitIntervalMs(0)

        const randomWallet = Wallet.createRandom().connect(spaceDapp.provider)

        const ethToSend = utils.parseEther('0.1')

        // transfer eth is a simple op that will bypass the paymaster proxy middleware
        const ogOpTx = await userOpsAlice.sendTransferEthOp(
            { recipient: randomWallet.address, value: ethToSend },
            alice.wallet,
        )

        const ogOp = selectUserOpsByAddress(aaAddress).current.op!

        expect(ogOp.maxFeePerGas).toBeDefined()
        expect(ogOp.maxPriorityFeePerGas).toBeDefined()

        // this should be null b/c we're not waiting for the userop to be mined
        expect(await ogOpTx.getUserOperationReceipt()).toBeNull()
        const sendSpy = vi.spyOn(provider, 'send')

        // set the wait timeout and interval to 0 so we don't wait for the userop to be mined
        userOpClient.setWaitTimeoutMs(10_000)
        userOpClient.setWaitIntervalMs(100)
        const replacementOpTx = await userOpsAlice.dropAndReplace(ogOpTx.userOpHash, alice.wallet)

        expect((await replacementOpTx.getUserOperationReceipt())?.userOpHash).toBeDefined()

        const ethSendUserOperationCalls = sendSpy.mock.calls.filter((call) =>
            call[0].includes('eth_sendUserOperation'),
        )
        expect(ethSendUserOperationCalls.length).toBe(1)
        const replacementSendUserOpCall = ethSendUserOperationCalls[0]
        expect(replacementSendUserOpCall[1]).toBeDefined()
        const replacementOpParams = replacementSendUserOpCall[1][0] as IUserOperation

        expect(replacementOpParams.callData).toEqual(ogOp.callData)
        expect(replacementOpParams.initCode).toEqual(ogOp.initCode)
        expect(replacementOpParams.sender).toEqual(ogOp.sender)
        expect(replacementOpParams.nonce).toEqual(ogOp.nonce)

        // gas fees of the og op should be multiplied by the max multiplier
        expect([
            BigNumber.from(replacementOpParams.maxFeePerGas).toBigInt(),
            BigNumber.from(replacementOpParams.maxPriorityFeePerGas).toBigInt(),
        ]).toEqual([
            bigIntMultiply(ogOp.maxFeePerGas, MAX_MULTIPLIER),
            bigIntMultiply(ogOp.maxPriorityFeePerGas, MAX_MULTIPLIER),
        ])

        await sleepBetweenTxs(2_000)

        // make sure the original op was dropped
        userOpClient.setWaitTimeoutMs(0)
        userOpClient.setWaitIntervalMs(0)
        expect(await ogOpTx.getUserOperationReceipt()).toBeNull()
    },
    {
        retry: 3,
    },
)

test(
    'a userop that uses [executeBatch] and fails to get a receipt within the timeout should be replaced',
    async () => {
        const alice = new LocalhostWeb3Provider(
            process.env.AA_RPC_URL as string,
            generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
        )
        await alice.ready

        const { spaceDapp, userOps: userOpsAlice } = await createSpaceDappAndUserops(alice)
        let aaAddress = await userOpsAlice.getAbstractAccountAddress({
            rootKeyAddress: alice.wallet.address as Address,
        })
        expect(aaAddress).toBeDefined()
        aaAddress = aaAddress!
        const userOpClient = await userOpsAlice.getUserOpClient()
        // set the wait timeout and interval to 0 so we don't wait for the userop to be mined
        userOpClient.setWaitTimeoutMs(1)
        userOpClient.setWaitIntervalMs(0)

        const ogOpTx = await createUngatedSpace({
            userOps: userOpsAlice,
            spaceDapp,
            signer: alice.wallet,
            rolePermissions: [Permission.Read, Permission.Write],
            spaceName: 'test',
        })

        const ogOp = selectUserOpsByAddress(aaAddress).current.op!

        expect(ogOp.maxFeePerGas).toBeDefined()
        expect(ogOp.maxPriorityFeePerGas).toBeDefined()

        // this should be null b/c we're not waiting for the userop to be mined
        expect(await ogOpTx.getUserOperationReceipt()).toBeNull()
        const sendSpy = vi.spyOn(provider, 'send')

        // set the wait timeout and interval to 0 so we don't wait for the userop to be mined
        userOpClient.setWaitTimeoutMs(10_000)
        userOpClient.setWaitIntervalMs(100)
        const replacementOpTx = await userOpsAlice.dropAndReplace(ogOpTx.userOpHash, alice.wallet)

        expect((await replacementOpTx.getUserOperationReceipt())?.userOpHash).toBeDefined()

        const ethSendUserOperationCalls = sendSpy.mock.calls.filter((call) =>
            call[0].includes('eth_sendUserOperation'),
        )
        expect(ethSendUserOperationCalls.length).toBe(1)
        const replacementSendUserOpCall = ethSendUserOperationCalls[0]
        expect(replacementSendUserOpCall[1]).toBeDefined()
        const replacementOpParams = replacementSendUserOpCall[1][0] as IUserOperation

        expect(replacementOpParams.callData).toEqual(ogOp.callData)
        expect(replacementOpParams.initCode).toEqual(ogOp.initCode)
        expect(replacementOpParams.sender).toEqual(ogOp.sender)
        expect(replacementOpParams.nonce).toEqual(ogOp.nonce)

        // gas fees of the og op should be multiplied by the max multiplier
        expect([
            BigNumber.from(replacementOpParams.maxFeePerGas).toBigInt(),
            BigNumber.from(replacementOpParams.maxPriorityFeePerGas).toBigInt(),
        ]).toEqual([
            bigIntMultiply(ogOp.maxFeePerGas, MAX_MULTIPLIER),
            bigIntMultiply(ogOp.maxPriorityFeePerGas, MAX_MULTIPLIER),
        ])

        await sleepBetweenTxs(2_000)

        // make sure the original op was dropped
        userOpClient.setWaitTimeoutMs(0)
        userOpClient.setWaitIntervalMs(0)
        expect(await ogOpTx.getUserOperationReceipt()).toBeNull()
    },
    {
        retry: 3,
    },
)

test(
    'a userop that fails to get a receipt and fails to successfully drop and replace should be replaced with a new op',
    async () => {
        const alice = new LocalhostWeb3Provider(
            process.env.AA_RPC_URL as string,
            generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
        )
        await alice.ready

        const { spaceDapp, userOps: userOpsAlice } = await createSpaceDappAndUserops(alice)
        const aaAddress = await fundAbstractAccount(alice, userOpsAlice)
        const userOpClient = await userOpsAlice.getUserOpClient()
        // set the wait timeout and interval to 0 so we don't wait for the userop to be mined
        userOpClient.setWaitTimeoutMs(1)
        userOpClient.setWaitIntervalMs(0)

        const randomWallet = Wallet.createRandom().connect(spaceDapp.provider)

        const ethToSend = utils.parseEther('0.1')

        // transfer eth is a simple op that will bypass the paymaster proxy middleware
        const ogOpTx = await userOpsAlice.sendTransferEthOp(
            { recipient: randomWallet.address, value: ethToSend },
            alice.wallet,
        )

        const ogOp = selectUserOpsByAddress(aaAddress).current.op!

        expect(ogOp.maxFeePerGas).toBeDefined()
        expect(ogOp.maxPriorityFeePerGas).toBeDefined()

        // this should be null b/c we're not waiting for the userop to be mined
        expect(await ogOpTx.getUserOperationReceipt()).toBeNull()
        const sendSpy = vi.spyOn(provider, 'send')

        const replacementOpTx = await userOpsAlice.dropAndReplace(ogOpTx.userOpHash, alice.wallet)
        expect(await replacementOpTx.getUserOperationReceipt()).toBeNull()

        const ethSendUserOperationCalls = sendSpy.mock.calls.filter((call) =>
            call[0].includes('eth_sendUserOperation'),
        )
        expect(ethSendUserOperationCalls.length).toBe(1)
        const replacementSendUserOpCall = ethSendUserOperationCalls[0]
        expect(replacementSendUserOpCall[1]).toBeDefined()
        const replacementOpParams = replacementSendUserOpCall[1][0] as IUserOperation

        expect(replacementOpParams.callData).toEqual(ogOp.callData)
        expect(replacementOpParams.initCode).toEqual(ogOp.initCode)
        expect(replacementOpParams.sender).toEqual(ogOp.sender)
        expect(replacementOpParams.nonce).toEqual(ogOp.nonce)

        // gas fees of the og op should be multiplied by the max multiplier
        expect([
            BigNumber.from(replacementOpParams.maxFeePerGas).toBigInt(),
            BigNumber.from(replacementOpParams.maxPriorityFeePerGas).toBigInt(),
        ]).toEqual([
            bigIntMultiply(ogOp.maxFeePerGas, MAX_MULTIPLIER),
            bigIntMultiply(ogOp.maxPriorityFeePerGas, MAX_MULTIPLIER),
        ])

        sendSpy.mockClear()

        const thirdOpTx = await createUngatedSpace({
            userOps: userOpsAlice,
            spaceDapp,
            signer: alice.wallet,
            rolePermissions: [Permission.Read, Permission.Write],
        })

        await sleepBetweenTxs(4_000)
        expect((await thirdOpTx.getUserOperationReceipt())?.userOpHash).toBeDefined()

        const ethSendUserOperationCalls2 = sendSpy.mock.calls.filter((call) =>
            call[0].includes('eth_sendUserOperation'),
        )
        expect(ethSendUserOperationCalls2.length).toBe(1)
        const thirdOpSendUserOpCall = ethSendUserOperationCalls2[0]
        expect(thirdOpSendUserOpCall[1]).toBeDefined()
        const thirdOpParams = thirdOpSendUserOpCall[1][0] as IUserOperation

        // gas fees of the og op should be multiplied by the max multiplier
        expect([
            BigNumber.from(thirdOpParams.maxFeePerGas).toBigInt(),
            BigNumber.from(thirdOpParams.maxPriorityFeePerGas).toBigInt(),
        ]).toEqual([
            bigIntMultiply(replacementOpParams.maxFeePerGas, MAX_MULTIPLIER),
            bigIntMultiply(replacementOpParams.maxPriorityFeePerGas, MAX_MULTIPLIER),
        ])
    },
    {
        retry: 3,
    },
)

async function fundAbstractAccount(provider: LocalhostWeb3Provider, userOps: TestUserOps) {
    // this is the same as the anvil acct 0 private key and is used as the signing key for the bundler - its funded
    const bundlerKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
    const bundlerWallet = new Wallet(bundlerKey).connect(provider)
    let aaAddress = await userOps.getAbstractAccountAddress({
        rootKeyAddress: provider.wallet.address as Address,
    })
    expect(aaAddress).toBeDefined()
    aaAddress = aaAddress!

    // fund aa address
    const tx = await bundlerWallet.sendTransaction({ to: aaAddress, value: utils.parseEther('1') })
    await tx.wait()
    expect(utils.formatEther(await provider.getBalance(aaAddress))).toBe('1.0')

    return aaAddress
}
