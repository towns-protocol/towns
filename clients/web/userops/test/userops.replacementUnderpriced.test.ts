import { Address, LocalhostWeb3Provider } from '@towns-protocol/web3'
import { Permission } from '@towns-protocol/web3'
import {
    createSpaceDappAndUserops,
    createUngatedSpace,
    generatePrivyWalletIfKey,
    mockViemSendUserOperation,
} from './utils'
import { expect, vi, test } from 'vitest'
import { selectUserOpsByAddress, userOpsStore } from '../src/store/userOpsStore'
import { bigIntMultiply } from '../src/utils/bigInt'
import { MAX_MULTIPLIER } from '../src/constants'
import { Wallet, utils } from 'ethers'
import { BigNumber } from 'ethers'
import { TestUserOps } from './TestUserOps'
import { BaseError, Hex, hexToBigInt, RpcUserOperation } from 'viem'
import { entryPoint06Address, getUserOperationError, UserOperation } from 'viem/account-abstraction'
import { PaymasterProxyPostData } from '../src/lib/permissionless/middleware/paymaster'

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
        const smartAccountClient = await userOpsAlice.getSmartAccountClient({
            signer: alice.wallet,
        })
        // set the wait timeout and interval to 0 so we don't wait for the userop to be mined
        smartAccountClient.setWaitTimeoutMs(1)
        smartAccountClient.setWaitIntervalMs(0)

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

            const actualMaxFeePerGas = requestBody.data.gasOverrides?.maxFeePerGas as Hex
            const actualMaxPriorityFeePerGas = requestBody.data.gasOverrides
                ?.maxPriorityFeePerGas as Hex

            const expectedMaxFeePerGas = bigIntMultiply(
                BigNumber.from(ogOp.maxFeePerGas).toBigInt(),
                MAX_MULTIPLIER,
            )
            const expectedMaxPriorityFeePerGas = bigIntMultiply(
                BigNumber.from(ogOp.maxPriorityFeePerGas).toBigInt(),
                MAX_MULTIPLIER,
            )

            return (
                hexToBigInt(actualMaxFeePerGas) === expectedMaxFeePerGas &&
                hexToBigInt(actualMaxPriorityFeePerGas) === expectedMaxPriorityFeePerGas
            )
        })

        expect(hasExpectedGasOverrides).toBe(true)
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
        const smartAccountClient = await userOpsAlice.getSmartAccountClient({
            signer: alice.wallet,
        })
        // set the wait timeout and interval to 0 so we don't wait for the userop to be mined
        smartAccountClient.setWaitTimeoutMs(1)
        smartAccountClient.setWaitIntervalMs(0)
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

        // // this should be null b/c we're not waiting for the userop to be mined
        expect(await ogOpTx.getUserOperationReceipt()).toBeNull()

        const callParams: RpcUserOperation[] = []
        vi.spyOn(smartAccountClient.client, 'sendUserOperation').mockImplementation(
            async (parameters) => {
                const { rpcParameters, signature, request } = await mockViemSendUserOperation(
                    smartAccountClient.client,
                    {
                        ...parameters,
                        callGasLimit: 1_000_000n,
                        verificationGasLimit: 3_000_000n,
                        preVerificationGas: 1_000_000n,
                    },
                )
                callParams.push(rpcParameters)
                try {
                    return await smartAccountClient.client.request(
                        {
                            method: 'eth_sendUserOperation',
                            params: [rpcParameters, entryPoint06Address],
                        },
                        { retryCount: 0 },
                    )
                } catch (error) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
                    const calls = (parameters as any).calls
                    throw getUserOperationError(error as BaseError, {
                        ...(request as UserOperation),
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        ...(calls ? { calls } : {}),
                        signature,
                    })
                }
            },
        )

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
        expect(callParams.length).toBe(1)
        const replacementOpParams = callParams[0]
        expect(replacementOpParams).toBeDefined()

        expect(replacementOpParams?.callData).toEqual(ogOp.callData)
        expect(replacementOpParams?.initCode).toEqual(ogOp.initCode)
        expect(replacementOpParams?.sender).toEqual(ogOp.sender)
        expect(hexToBigInt(replacementOpParams?.nonce)).toEqual(ogOp.nonce)

        // gas fees of the og op should be multiplied by the max multiplier
        expect([
            BigNumber.from(replacementOpParams?.maxFeePerGas).toBigInt(),
            BigNumber.from(replacementOpParams?.maxPriorityFeePerGas).toBigInt(),
        ]).toEqual([
            bigIntMultiply(BigNumber.from(ogOp.maxFeePerGas).toBigInt(), MAX_MULTIPLIER),
            bigIntMultiply(BigNumber.from(ogOp.maxPriorityFeePerGas).toBigInt(), MAX_MULTIPLIER),
        ])

        // the og op should have been dropped
        expect(await ogOpTx.getUserOperationReceipt()).toBeNull()
        // the replacement op should have succeeded
        await vi.waitFor(
            async () => {
                const receipt = await replacementOpTx!.getUserOperationReceipt()
                expect(receipt?.userOpHash).toBeDefined()
                return receipt?.userOpHash
            },
            {
                timeout: 10_000,
                interval: 500,
            },
        )
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
        const smartAccountClient = await userOpsAlice.getSmartAccountClient({
            signer: alice.wallet,
        })
        // set the wait timeout and interval to 0 so we don't wait for the userop to be mined
        smartAccountClient.setWaitTimeoutMs(1)
        smartAccountClient.setWaitIntervalMs(0)

        const randomWallet = Wallet.createRandom().connect(spaceDapp.provider)
        const aaAddress = await fundAbstractAccount(alice, userOpsAlice)

        const storedOp = {
            callData: '0x',
            initCode: '0x',
            sender: aaAddress,
            nonce: 0n,
            maxFeePerGas: 10000000000n,
            maxPriorityFeePerGas: 10000000000n,
            callGasLimit: 0n,
            verificationGasLimit: 0n,
            preVerificationGas: 0n,
            paymasterAndData: '0x',
            signature: '0x',
        } satisfies UserOperation

        userOpsStore.setState((state) => {
            state.userOps[aaAddress] ??= {
                retryDetails: undefined,
                rejectedSponsorshipReason: undefined,
                promptResponse: undefined,
                operationAttempt: 1,
                promptUser: false,
                current: {
                    op: undefined,
                },
                pending: {
                    op: storedOp,
                    hash: '0x33b63588947990068dbccfbdc679d684d36c7ace2840cc95763bbc122baf7efe',
                },
            }
        })

        const ethToSend = utils.parseEther('0.1')

        const callParams: RpcUserOperation[] = []
        vi.spyOn(smartAccountClient.client, 'sendUserOperation').mockImplementation(
            async (parameters) => {
                const { rpcParameters, signature, request } = await mockViemSendUserOperation(
                    smartAccountClient.client,
                    {
                        ...parameters,
                        preVerificationGas: 1_000_000n,
                        verificationGasLimit: 3_000_000n,
                        callGasLimit: 1_000_000n,
                    },
                )
                callParams.push(rpcParameters)
                try {
                    return await smartAccountClient.client.request(
                        {
                            method: 'eth_sendUserOperation',
                            params: [rpcParameters, entryPoint06Address],
                        },
                        { retryCount: 0 },
                    )
                } catch (error) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
                    const calls = (parameters as any).calls
                    throw getUserOperationError(error as BaseError, {
                        ...(request as UserOperation),
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        ...(calls ? { calls } : {}),
                        signature,
                    })
                }
            },
        )

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
        expect(callParams.length).toBe(1)
        const replacementOpParams = callParams[0]
        expect(replacementOpParams).toBeDefined()

        // gas fees of the og op should be multiplied by the max multiplier
        expect([
            BigNumber.from(replacementOpParams.maxFeePerGas).toBigInt(),
            BigNumber.from(replacementOpParams.maxPriorityFeePerGas).toBigInt(),
        ]).toEqual([
            bigIntMultiply(BigNumber.from(storedOp.maxFeePerGas).toBigInt(), MAX_MULTIPLIER),
            bigIntMultiply(
                BigNumber.from(storedOp.maxPriorityFeePerGas).toBigInt(),
                MAX_MULTIPLIER,
            ),
        ])

        // the replacement op should have succeeded
        await vi.waitFor(
            async () => {
                const receipt = await replacementOpTx!.getUserOperationReceipt()
                expect(receipt?.userOpHash).toBeDefined()
                return receipt?.userOpHash
            },
            {
                timeout: 10_000,
                interval: 500,
            },
        )

        const freshOp = await userOpsAlice.sendTransferEthOp(
            { recipient: randomWallet.address, value: ethToSend },
            alice.wallet,
        )

        await vi.waitFor(
            async () => {
                const receipt = await freshOp.getUserOperationReceipt()
                expect(receipt?.userOpHash).toBeDefined()
                return receipt?.userOpHash
            },
            {
                timeout: 10_000,
                interval: 500,
            },
        )
    },
    {
        retry: 3,
    },
)

// The below tests are skipped b/c they use dropAndReplace, which he have yet to utilize anywhere in Towns
// and need to be updated to use the new permissionless userops

test.skip(
    'a userop that uses [execute] and fails to get a receipt within the timeout should be replaced',
    async () => {
        // const alice = new LocalhostWeb3Provider(
        //     process.env.AA_RPC_URL as string,
        //     generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
        // )
        // await alice.ready
        // const { spaceDapp, userOps: userOpsAlice } = await createSpaceDappAndUserops(alice)
        // const aaAddress = await fundAbstractAccount(alice, userOpsAlice)
        // const smartAccountClient = await userOpsAlice.getSmartAccountClient({
        //     signer: alice.wallet,
        // })
        // // set the wait timeout and interval to 0 so we don't wait for the userop to be mined
        // smartAccountClient.setWaitTimeoutMs(1)
        // smartAccountClient.setWaitIntervalMs(0)
        // const randomWallet = Wallet.createRandom().connect(spaceDapp.provider)
        // const ethToSend = utils.parseEther('0.1')
        // // transfer eth is a simple op that will bypass the paymaster proxy middleware
        // const ogOpTx = await userOpsAlice.sendTransferEthOp(
        //     { recipient: randomWallet.address, value: ethToSend },
        //     alice.wallet,
        // )
        // const ogOp = selectUserOpsByAddress(aaAddress).current.op!
        // expect(ogOp.maxFeePerGas).toBeDefined()
        // expect(ogOp.maxPriorityFeePerGas).toBeDefined()
        // // this should be null b/c we're not waiting for the userop to be mined
        // expect(await ogOpTx.getUserOperationReceipt()).toBeNull()
        // const sendSpy = vi.spyOn(provider, 'send')
        // // set the wait timeout and interval to 0 so we don't wait for the userop to be mined
        // smartAccountClient.setWaitTimeoutMs(10_000)
        // smartAccountClient.setWaitIntervalMs(100)
        // const replacementOpTx = await userOpsAlice.dropAndReplace(ogOpTx.userOpHash, alice.wallet)
        // expect((await replacementOpTx.getUserOperationReceipt())?.userOpHash).toBeDefined()
        // const ethSendUserOperationCalls = sendSpy.mock.calls.filter((call) =>
        //     call[0].includes('eth_sendUserOperation'),
        // )
        // expect(ethSendUserOperationCalls.length).toBe(1)
        // const replacementSendUserOpCall = ethSendUserOperationCalls[0]
        // expect(replacementSendUserOpCall[1]).toBeDefined()
        // const replacementOpParams = replacementSendUserOpCall[1][0] as IUserOperation
        // expect(replacementOpParams.callData).toEqual(ogOp.callData)
        // expect(replacementOpParams.initCode).toEqual(ogOp.initCode)
        // expect(replacementOpParams.sender).toEqual(ogOp.sender)
        // expect(replacementOpParams.nonce).toEqual(ogOp.nonce)
        // // gas fees of the og op should be multiplied by the max multiplier
        // expect([
        //     BigNumber.from(replacementOpParams.maxFeePerGas).toBigInt(),
        //     BigNumber.from(replacementOpParams.maxPriorityFeePerGas).toBigInt(),
        // ]).toEqual([
        //     bigIntMultiply(BigNumber.from(ogOp.maxFeePerGas).toBigInt(), MAX_MULTIPLIER),
        //     bigIntMultiply(BigNumber.from(ogOp.maxPriorityFeePerGas).toBigInt(), MAX_MULTIPLIER),
        // ])
        // await sleepBetweenTxs(2_000)
        // // make sure the original op was dropped
        // smartAccountClient.setWaitTimeoutMs(0)
        // smartAccountClient.setWaitIntervalMs(0)
        // expect(await ogOpTx.getUserOperationReceipt()).toBeNull()
    },
    {
        retry: 3,
    },
)

test.skip(
    'a userop that uses [executeBatch] and fails to get a receipt within the timeout should be replaced',
    async () => {
        // const alice = new LocalhostWeb3Provider(
        //     process.env.AA_RPC_URL as string,
        //     generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
        // )
        // await alice.ready
        // const { spaceDapp, userOps: userOpsAlice } = await createSpaceDappAndUserops(alice)
        // const smartAccountClient = await userOpsAlice.getSmartAccountClient({
        //     signer: alice.wallet,
        // })
        // let aaAddress = await userOpsAlice.getAbstractAccountAddress({
        //     rootKeyAddress: alice.wallet.address as Address,
        // })
        // expect(aaAddress).toBeDefined()
        // aaAddress = aaAddress!
        // // set the wait timeout and interval to 0 so we don't wait for the userop to be mined
        // smartAccountClient.setWaitTimeoutMs(1)
        // smartAccountClient.setWaitIntervalMs(0)
        // const ogOpTx = await createUngatedSpace({
        //     userOps: userOpsAlice,
        //     spaceDapp,
        //     signer: alice.wallet,
        //     rolePermissions: [Permission.Read, Permission.Write],
        //     spaceName: 'test',
        // })
        // const ogOp = selectUserOpsByAddress(aaAddress).current.op!
        // expect(ogOp.maxFeePerGas).toBeDefined()
        // expect(ogOp.maxPriorityFeePerGas).toBeDefined()
        // // this should be null b/c we're not waiting for the userop to be mined
        // expect(await ogOpTx.getUserOperationReceipt()).toBeNull()
        // const sendSpy = vi.spyOn(provider, 'send')
        // // set the wait timeout and interval to 0 so we don't wait for the userop to be mined
        // smartAccountClient.setWaitTimeoutMs(10_000)
        // smartAccountClient.setWaitIntervalMs(100)
        // const replacementOpTx = await userOpsAlice.dropAndReplace(ogOpTx.userOpHash, alice.wallet)
        // expect((await replacementOpTx.getUserOperationReceipt())?.userOpHash).toBeDefined()
        // const ethSendUserOperationCalls = sendSpy.mock.calls.filter((call) =>
        //     call[0].includes('eth_sendUserOperation'),
        // )
        // expect(ethSendUserOperationCalls.length).toBe(1)
        // const replacementSendUserOpCall = ethSendUserOperationCalls[0]
        // expect(replacementSendUserOpCall[1]).toBeDefined()
        // const replacementOpParams = replacementSendUserOpCall[1][0] as IUserOperation
        // expect(replacementOpParams.callData).toEqual(ogOp.callData)
        // expect(replacementOpParams.initCode).toEqual(ogOp.initCode)
        // expect(replacementOpParams.sender).toEqual(ogOp.sender)
        // expect(replacementOpParams.nonce).toEqual(ogOp.nonce)
        // // gas fees of the og op should be multiplied by the max multiplier
        // expect([
        //     BigNumber.from(replacementOpParams.maxFeePerGas).toBigInt(),
        //     BigNumber.from(replacementOpParams.maxPriorityFeePerGas).toBigInt(),
        // ]).toEqual([
        //     bigIntMultiply(BigNumber.from(ogOp.maxFeePerGas).toBigInt(), MAX_MULTIPLIER),
        //     bigIntMultiply(BigNumber.from(ogOp.maxPriorityFeePerGas).toBigInt(), MAX_MULTIPLIER),
        // ])
        // await sleepBetweenTxs(2_000)
        // // make sure the original op was dropped
        // smartAccountClient.setWaitTimeoutMs(0)
        // smartAccountClient.setWaitIntervalMs(0)
        // expect(await ogOpTx.getUserOperationReceipt()).toBeNull()
    },
    {
        retry: 3,
    },
)

test.skip(
    'a userop that fails to get a receipt and fails to successfully drop and replace should be replaced with a new op',
    async () => {
        // const alice = new LocalhostWeb3Provider(
        //     process.env.AA_RPC_URL as string,
        //     generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
        // )
        // await alice.ready
        // const { spaceDapp, userOps: userOpsAlice } = await createSpaceDappAndUserops(alice)
        // const aaAddress = await fundAbstractAccount(alice, userOpsAlice)
        // const smartAccountClient = await userOpsAlice.getSmartAccountClient({
        //     signer: alice.wallet,
        // })
        // // set the wait timeout and interval to 0 so we don't wait for the userop to be mined
        // smartAccountClient.setWaitTimeoutMs(1)
        // smartAccountClient.setWaitIntervalMs(0)
        // const randomWallet = Wallet.createRandom().connect(spaceDapp.provider)
        // const ethToSend = utils.parseEther('0.1')
        // // transfer eth is a simple op that will bypass the paymaster proxy middleware
        // const ogOpTx = await userOpsAlice.sendTransferEthOp(
        //     { recipient: randomWallet.address, value: ethToSend },
        //     alice.wallet,
        // )
        // const ogOp = selectUserOpsByAddress(aaAddress).current.op!
        // expect(ogOp.maxFeePerGas).toBeDefined()
        // expect(ogOp.maxPriorityFeePerGas).toBeDefined()
        // // this should be null b/c we're not waiting for the userop to be mined
        // expect(await ogOpTx.getUserOperationReceipt()).toBeNull()
        // const sendSpy = vi.spyOn(provider, 'send')
        // const replacementOpTx = await userOpsAlice.dropAndReplace(ogOpTx.userOpHash, alice.wallet)
        // expect(await replacementOpTx.getUserOperationReceipt()).toBeNull()
        // const ethSendUserOperationCalls = sendSpy.mock.calls.filter((call) =>
        //     call[0].includes('eth_sendUserOperation'),
        // )
        // expect(ethSendUserOperationCalls.length).toBe(1)
        // const replacementSendUserOpCall = ethSendUserOperationCalls[0]
        // expect(replacementSendUserOpCall[1]).toBeDefined()
        // const replacementOpParams = replacementSendUserOpCall[1][0] as IUserOperation
        // expect(replacementOpParams.callData).toEqual(ogOp.callData)
        // expect(replacementOpParams.initCode).toEqual(ogOp.initCode)
        // expect(replacementOpParams.sender).toEqual(ogOp.sender)
        // expect(replacementOpParams.nonce).toEqual(ogOp.nonce)
        // // gas fees of the og op should be multiplied by the max multiplier
        // expect([
        //     BigNumber.from(replacementOpParams.maxFeePerGas).toBigInt(),
        //     BigNumber.from(replacementOpParams.maxPriorityFeePerGas).toBigInt(),
        // ]).toEqual([
        //     bigIntMultiply(BigNumber.from(ogOp.maxFeePerGas).toBigInt(), MAX_MULTIPLIER),
        //     bigIntMultiply(BigNumber.from(ogOp.maxPriorityFeePerGas).toBigInt(), MAX_MULTIPLIER),
        // ])
        // sendSpy.mockClear()
        // const thirdOpTx = await createUngatedSpace({
        //     userOps: userOpsAlice,
        //     spaceDapp,
        //     signer: alice.wallet,
        //     rolePermissions: [Permission.Read, Permission.Write],
        // })
        // await sleepBetweenTxs(4_000)
        // expect((await thirdOpTx.getUserOperationReceipt())?.userOpHash).toBeDefined()
        // const ethSendUserOperationCalls2 = sendSpy.mock.calls.filter((call) =>
        //     call[0].includes('eth_sendUserOperation'),
        // )
        // expect(ethSendUserOperationCalls2.length).toBe(1)
        // const thirdOpSendUserOpCall = ethSendUserOperationCalls2[0]
        // expect(thirdOpSendUserOpCall[1]).toBeDefined()
        // const thirdOpParams = thirdOpSendUserOpCall[1][0] as IUserOperation
        // // gas fees of the og op should be multiplied by the max multiplier
        // expect([
        //     BigNumber.from(thirdOpParams.maxFeePerGas).toBigInt(),
        //     BigNumber.from(thirdOpParams.maxPriorityFeePerGas).toBigInt(),
        // ]).toEqual([
        //     bigIntMultiply(
        //         BigNumber.from(replacementOpParams.maxFeePerGas).toBigInt(),
        //         MAX_MULTIPLIER,
        //     ),
        //     bigIntMultiply(
        //         BigNumber.from(replacementOpParams.maxPriorityFeePerGas).toBigInt(),
        //         MAX_MULTIPLIER,
        //     ),
        // ])
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
