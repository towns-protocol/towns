import { LocalhostWeb3Provider } from '@river-build/web3'
import { Permission } from '@river-build/web3'
import {
    createSpaceDappAndUserops,
    createUngatedSpace,
    generatePrivyWalletIfKey,
    mockViemSendUserOperation,
} from './utils'
import { expect, vi } from 'vitest'
import * as errors from '../src/errors'
import * as paymasterUseropjs from '../src/lib/useropjs/middlewares/paymasterProxyMiddleware'
import * as paymasterPermissionless from '../src/lib/permissionless/middleware/paymaster'
import * as promptUser from '../src/store/promptUser'
import { ISendUserOperationOpts, UserOperationBuilder } from 'userop'

test('useropjs: a sponsored userop that fails because of unknown connector runs again', async () => {
    const alice = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )
    await alice.ready

    const { spaceDapp, userOps: userOpsAlice } = await createSpaceDappAndUserops(alice, 'useropjs')
    const useropClient = await userOpsAlice.getUserOpClient()

    const sendSpy = vi.spyOn(useropClient, 'sendUserOperation')
    const isUnknownConnectorSpy = vi.spyOn(errors, 'matchPrivyUnknownConnectorError')
    const paymasterProxyMiddlewareSpy = vi.spyOn(paymasterUseropjs, 'paymasterProxyMiddleware')
    isUnknownConnectorSpy.mockImplementation(() => ({
        error: new errors.CodeException({
            code: 'unknown',
            message: 'Unknown connector',
            category: 'userop',
        }),
        type: 'privy',
    }))
    sendSpy.mockImplementation(
        async (builder: UserOperationBuilder, opts?: ISendUserOperationOpts) => {
            await useropClient.buildUserOperation(builder, opts?.stateOverrides)
            throw new Error()
        },
    )

    // retry defaults to 3 times
    await expect(async () =>
        createUngatedSpace({
            userOps: userOpsAlice,
            spaceDapp,
            signer: alice.wallet,
            rolePermissions: [Permission.Read, Permission.Write],
        }),
    ).rejects.toThrow()
    expect(paymasterProxyMiddlewareSpy).toHaveBeenCalledTimes(3)
})

test('useropjs: a non-sponsored userop that fails because of gas too low runs again', async () => {
    const alice = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )
    await alice.ready

    const { spaceDapp, userOps: userOpsAlice } = await createSpaceDappAndUserops(alice, 'useropjs')
    const useropClient = await userOpsAlice.getUserOpClient()

    const sendSpy = vi.spyOn(useropClient, 'sendUserOperation')
    let count = 0
    const isUnknownConnectorSpy = vi.spyOn(errors, 'matchPrivyUnknownConnectorError')
    vi.spyOn(paymasterUseropjs, 'paymasterProxyMiddleware').mockImplementation(async () => {
        return Promise.resolve()
    })
    isUnknownConnectorSpy.mockImplementation(() => ({
        error: new errors.CodeException({
            code: 'unknown',
            message: 'Unknown connector',
            category: 'userop',
        }),
        type: 'privy',
    }))
    sendSpy.mockImplementation(
        async (builder: UserOperationBuilder, opts?: ISendUserOperationOpts) => {
            await useropClient.buildUserOperation(builder, opts?.stateOverrides)
            if (count > 2) {
                return {
                    userOpHash: '0x123',
                    wait: async () => Promise.resolve(null),
                    getUserOperationReceipt: async () => Promise.resolve(null),
                }
            }
            throw new Error()
        },
    )
    const promptUserSpy = vi.spyOn(promptUser, 'promptUser').mockImplementation(async () => {
        count++
        return Promise.resolve()
    })

    // retry defaults to 3 times
    await expect(
        createUngatedSpace({
            userOps: userOpsAlice,
            spaceDapp,
            signer: alice.wallet,
            rolePermissions: [Permission.Read, Permission.Write],
        }),
    ).resolves.toBeTruthy()
    expect(promptUserSpy).toHaveBeenCalledTimes(3)
})

test('permissionless: a sponsored userop that fails because of unknown connector runs again', async () => {
    const alice = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )
    await alice.ready

    const { spaceDapp, userOps: userOpsAlice } = await createSpaceDappAndUserops(
        alice,
        'permissionless',
    )
    const smartAccountClient = await userOpsAlice.getSmartAccountClient({
        signer: alice.wallet,
    })

    const sendSpy = vi.spyOn(smartAccountClient.client, 'sendUserOperation')
    const isUnknownConnectorSpy = vi.spyOn(errors, 'matchPrivyUnknownConnectorError')
    const paymasterProxyMiddlewareSpy = vi.spyOn(
        paymasterPermissionless,
        'paymasterProxyMiddleware',
    )
    isUnknownConnectorSpy.mockImplementation(() => ({
        error: new errors.CodeException({
            code: 'unknown',
            message: 'Unknown connector',
            category: 'userop',
        }),
        type: 'privy',
    }))
    sendSpy.mockImplementation(async (parameters) => {
        await mockViemSendUserOperation(smartAccountClient.client, parameters)
        throw new Error()
    })

    // retry defaults to 3 times
    await expect(async () =>
        createUngatedSpace({
            userOps: userOpsAlice,
            spaceDapp,
            signer: alice.wallet,
            rolePermissions: [Permission.Read, Permission.Write],
        }),
    ).rejects.toThrow()
    expect(paymasterProxyMiddlewareSpy).toHaveBeenCalledTimes(3)
})

test('permissionless: a non-sponsored userop that fails because of gas too low runs again', async () => {
    const alice = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )
    await alice.ready

    const { spaceDapp, userOps: userOpsAlice } = await createSpaceDappAndUserops(
        alice,
        'permissionless',
    )
    const smartAccountClient = await userOpsAlice.getSmartAccountClient({
        signer: alice.wallet,
    })

    const sendSpy = vi.spyOn(smartAccountClient.client, 'sendUserOperation')
    let count = 0
    const isUnknownConnectorSpy = vi.spyOn(errors, 'matchPrivyUnknownConnectorError')

    vi.spyOn(paymasterPermissionless, 'paymasterProxyMiddleware').mockImplementation(async () => {
        return {
            paymasterAndData: '0x',
            // these cannot be 0n, or the alto bundler will reject
            preVerificationGas: 2n,
            verificationGasLimit: 2n,
            callGasLimit: 2n,
        }
    })
    isUnknownConnectorSpy.mockImplementation(() => ({
        error: new errors.CodeException({
            code: 'unknown',
            message: 'Unknown connector',
            category: 'userop',
        }),
        type: 'privy',
    }))
    sendSpy.mockImplementation(async (parameters) => {
        await mockViemSendUserOperation(smartAccountClient.client, parameters)
        if (count > 2) {
            return '0x123'
        }
        throw new Error()
    })
    const promptUserSpy = vi.spyOn(promptUser, 'promptUser').mockImplementation(async () => {
        count++
        return Promise.resolve()
    })

    // retry defaults to 3 times
    await expect(
        createUngatedSpace({
            userOps: userOpsAlice,
            spaceDapp,
            signer: alice.wallet,
            rolePermissions: [Permission.Read, Permission.Write],
        }),
    ).resolves.toBeTruthy()
    expect(promptUserSpy).toHaveBeenCalledTimes(3)
})
