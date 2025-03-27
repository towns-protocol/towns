import { createSmartAccountClient, CreateSmartAccountClientArgs } from '../createSmartAccountClient'
import { ERC4337 } from '../../../../constants'
import { toModularSmartAccount } from './toModularAccount'
import { Address, LocalAccount, Chain } from 'viem'
import { entryPoint07Address } from 'viem/account-abstraction'

export type ModularSmartAccountArgs = Omit<
    CreateSmartAccountClientArgs,
    'entrypointAddress' | 'factoryAddress' | 'smartAccountImpl'
> & {
    owner: LocalAccount
    rpcUrl: string
    chain: Chain
    address: Address
}

export async function modularSmartAccount(args: ModularSmartAccountArgs) {
    const { owner, address, publicRpcClient } = args

    const smartAccountImpl = await toModularSmartAccount({
        owner,
        address,
        client: publicRpcClient,
    })

    return createSmartAccountClient({
        ...args,
        entrypointAddress: entryPoint07Address,
        factoryAddress: ERC4337.ModularAccount.Factory as Address,
        smartAccountImpl,
    })
}
