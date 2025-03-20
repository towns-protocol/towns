import { LocalhostWeb3Provider } from '@towns-protocol/web3'
import { Permission } from '@towns-protocol/web3'
import { createSpaceDappAndUserops, createUngatedSpace, generatePrivyWalletIfKey } from './utils'
import * as privyLoginMethod from '../src/utils/privyLoginMethod'
import { vi } from 'vitest'

test('with non-sponsored login method, sponsorship is blocked', async () => {
    const alice = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )

    vi.spyOn(privyLoginMethod, 'getPrivyLoginMethodFromLocalStorage').mockReturnValueOnce('email')
    const { spaceDapp, userOps: userOpsAlice } = await createSpaceDappAndUserops(alice)

    await expect(async () =>
        createUngatedSpace({
            userOps: userOpsAlice,
            spaceDapp,
            signer: alice.wallet,
            rolePermissions: [Permission.Read, Permission.Write],
        }),
    ).rejects.toThrow()
})
