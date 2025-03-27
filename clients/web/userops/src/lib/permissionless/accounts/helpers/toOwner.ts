import {
    type Account,
    type Address,
    type Chain,
    type EIP1193Provider,
    type LocalAccount,
    type OneOf,
    type Transport,
    type WalletClient,
    createWalletClient,
    custom,
} from 'viem'
import { toAccount } from 'viem/accounts'

import { signTypedData } from 'viem/actions'
import { getAction } from 'viem/utils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EthereumProvider = OneOf<{ request(...args: any): Promise<any> } | EIP1193Provider>

export async function toOwner<provider extends EthereumProvider>({
    owner,
    address,
}: {
    owner: OneOf<provider | WalletClient<Transport, Chain | undefined, Account> | LocalAccount>
    address?: Address
}): Promise<LocalAccount> {
    if ('type' in owner && owner.type === 'local') {
        return owner as LocalAccount
    }

    let walletClient: WalletClient<Transport, Chain | undefined, Account> | undefined = undefined

    if ('request' in owner) {
        if (!address) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                ;[address] = await (owner as EthereumProvider).request({
                    method: 'eth_requestAccounts',
                })
            } catch {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                ;[address] = await (owner as EthereumProvider).request({
                    method: 'eth_accounts',
                })
            }
        }
        if (!address) {
            // For TS to be happy
            throw new Error('address is required')
        }
        walletClient = createWalletClient({
            account: address,
            transport: custom(owner as EthereumProvider),
        })
    }

    if (!walletClient) {
        walletClient = owner as WalletClient<Transport, Chain | undefined, Account>
    }

    return toAccount({
        address: walletClient.account.address,
        async signMessage({ message }) {
            return walletClient.signMessage({ message })
        },
        async signTypedData(typedData) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
            return getAction(walletClient, signTypedData, 'signTypedData')(typedData as any)
        },
        async signTransaction() {
            throw new Error("Smart account signer doesn't need to sign transactions")
        },
    })
}
