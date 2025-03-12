import { entryPoint06Address } from 'viem/account-abstraction'
import { createSmartAccountClient, CreateSmartAccountClientArgs } from '../createSmartAccountClient'
import { ERC4337 } from '../../../../constants'
import { Address, PublicClient } from 'viem'
import { ethersSignerToAccount } from '../../utils/ethersSignerToAccount'

// see ./toSimpleAccount.ts for why we're not using the permissionless.js fn
// import { toSimpleSmartAccount } from 'permissionless/accounts'
import { toSimpleSmartAccount } from './toSimpleAccount'

export async function simpleSmartAccount(
    args: Omit<
        CreateSmartAccountClientArgs<'0.6'>,
        'type' | 'entrypointVersion' | 'entrypointAddress' | 'factoryAddress' | 'smartAccountImpl'
    >,
) {
    return createSmartAccountClient({
        ...args,
        type: 'simple',
        entrypointVersion: '0.6',
        entrypointAddress: entryPoint06Address,
        factoryAddress: ERC4337.SimpleAccount.Factory as Address,
        smartAccountImpl: async (smartAccountArgs: { publicClient: PublicClient }) =>
            toSimpleSmartAccount({
                owner: await ethersSignerToAccount(args.signer),
                rpcUrl: args.rpcUrl,
                // 0n was original nonce for useropsjs
                nonceKey: 0n,
                client: smartAccountArgs.publicClient,
                entryPoint: {
                    address: entryPoint06Address,
                    version: '0.6',
                },
            }),
    })
}
