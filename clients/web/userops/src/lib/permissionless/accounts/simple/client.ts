import { createSmartAccountClient, CreateSmartAccountClientArgs } from '../createSmartAccountClient'
import { ERC4337 } from '../../../../constants'
import { encodeExecuteAbi, encodeExecuteBatchAbi } from './abi'
import { toSimpleSmartAccount } from 'permissionless/accounts'
import { LocalAccount, Chain, Hex, Address } from 'viem'
import { entryPoint06Address } from 'viem/account-abstraction'

export type SimpleSmartAccountArgs = Omit<
    CreateSmartAccountClientArgs,
    'entrypointAddress' | 'factoryAddress' | 'smartAccountImpl'
> & {
    owner: LocalAccount
    rpcUrl: string
    chain: Chain
    address: Address
}

export async function simpleSmartAccount(args: SimpleSmartAccountArgs) {
    const { owner, address, publicRpcClient } = args

    const smartAccountImpl = {
        ...(await toSimpleSmartAccount({
            owner,
            address,
            nonceKey: 0n, // should also be 0n b/c viem's default is not?
            // 0n was original nonce for useropsjs
            index: 0n,
            client: publicRpcClient,
            entryPoint: {
                address: entryPoint06Address,
                version: '0.6',
            },
        })),
        encodeExecute: async (args: { to: Address; value: bigint; data: Hex }) =>
            encodeExecuteAbi(args),
        encodeExecuteBatch: async (args: { to: Address[]; value: bigint[]; data: Hex[] }) => {
            const { to, data } = args
            return encodeExecuteBatchAbi({ to, data })
        },
    }

    return createSmartAccountClient({
        ...args,
        entrypointAddress: entryPoint06Address,
        factoryAddress: ERC4337.SimpleAccount.Factory as Address,
        smartAccountImpl,
        publicRpcClient,
    })
}
