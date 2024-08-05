import { LocalhostWeb3Provider } from '@river-build/web3'
import { Permission } from '@river-build/web3'
import { createSpaceDappAndUserops, createUngatedSpace, generatePrivyWalletIfKey } from './utils'
import { expect, vi } from 'vitest'
import * as errors from '../src/errors'

test('a userop that fails because of preverification runs again with an increased gas multiplier', async () => {
    const alice = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )
    await alice.ready

    const { spaceDapp, userOps: userOpsAlice } = createSpaceDappAndUserops(alice)
    const useropClient = await userOpsAlice.getUserOpClient()
    expect(userOpsAlice.middlewareVars.preverificationGasMultiplierValue).toBe(1)

    const sendSpy = vi.spyOn(useropClient, 'sendUserOperation')
    const preverificationErrorSpy = vi.spyOn(errors, 'isPreverificationGasTooLowError')
    preverificationErrorSpy.mockImplementation(() => true)
    sendSpy.mockImplementation(() => {
        throw new Error()
    })

    // retry defaults to 3 times
    await expect(() =>
        createUngatedSpace({
            userOps: userOpsAlice,
            spaceDapp,
            signer: alice.wallet,
            rolePermissions: [Permission.Read, Permission.Write],
        }),
    ).rejects.toThrow()
    // gas multiplier should be incremented each retry
    expect(userOpsAlice.middlewareVars.preverificationGasMultiplierValue).toBe(4)

    // this should reset the gas multiplier to 1
    await expect(() =>
        createUngatedSpace({
            userOps: userOpsAlice,
            spaceDapp,
            signer: alice.wallet,
            rolePermissions: [Permission.Read, Permission.Write],
        }),
    ).rejects.toThrow()
    // gas multiplier should be incremented each retry
    expect(userOpsAlice.middlewareVars.preverificationGasMultiplierValue).toBe(4)
})
