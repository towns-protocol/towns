import { LocalhostWeb3Provider } from '@river-build/web3'
import { Permission } from '@river-build/web3'
import { createSpaceDappAndUserops, createUngatedSpace, generatePrivyWalletIfKey } from './utils'
import { expect, vi } from 'vitest'
import * as errors from '../src/errors'
import * as paymasterProxyMiddleware from '../src/middlewares/paymasterProxyMiddleware'
import * as promptUser from '../src/middlewares/promptUser'
import { ISendUserOperationOpts, UserOperationBuilder } from 'userop'

test('a sponsored userop that fails because of unknown connector runs again', async () => {
    const alice = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )
    await alice.ready

    const { spaceDapp, userOps: userOpsAlice } = createSpaceDappAndUserops(alice)
    const useropClient = await userOpsAlice.getUserOpClient()

    const sendSpy = vi.spyOn(useropClient, 'sendUserOperation')
    const isUnknownConnectorSpy = vi.spyOn(errors, 'matchPrivyUnknownConnectorError')
    const paymasterProxyMiddlewareSpy = vi.spyOn(
        paymasterProxyMiddleware,
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
    sendSpy.mockImplementation(
        async (builder: UserOperationBuilder, opts?: ISendUserOperationOpts) => {
            await useropClient.buildUserOperation(builder, opts?.stateOverrides)
            throw new Error()
        },
    )

    // retry defaults to 3 times
    await expect(() =>
        createUngatedSpace({
            userOps: userOpsAlice,
            spaceDapp,
            signer: alice.wallet,
            rolePermissions: [Permission.Read, Permission.Write],
        }),
    ).rejects.toThrow()
    expect(paymasterProxyMiddlewareSpy).toHaveBeenCalledTimes(3)
})

test('a non-sponsored userop that fails because of gas too low runs again', async () => {
    const alice = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )
    await alice.ready

    const { spaceDapp, userOps: userOpsAlice } = createSpaceDappAndUserops(alice, {
        skipPromptUserOnPMRejectedOp: false,
    })
    const useropClient = await userOpsAlice.getUserOpClient()

    const sendSpy = vi.spyOn(useropClient, 'sendUserOperation')
    let count = 0
    const isUnknownConnectorSpy = vi.spyOn(errors, 'matchPrivyUnknownConnectorError')
    vi.spyOn(paymasterProxyMiddleware, 'paymasterProxyMiddleware').mockImplementation(() => {
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
                    wait: () => Promise.resolve(null),
                    getUserOperationReceipt: () => Promise.resolve(null),
                }
            }
            throw new Error()
        },
    )
    const promptUserSpy = vi.spyOn(promptUser, 'promptUser').mockImplementation(() => {
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
