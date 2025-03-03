import { hexToBytes, isBytes, isHex } from 'viem'
import { Signer } from 'ethers'
import { toAccount } from 'viem/accounts'
import { providers, TypedDataDomain, TypedDataField } from 'ethers'

export async function ethersSignerToAccount(signer: Signer) {
    const signerAddress = await signer.getAddress()

    return toAccount({
        address: signerAddress as `0x${string}`,
        signMessage: async ({ message }) => {
            if (typeof message === 'string') {
                return signer.signMessage(
                    hexToBytes(message as `0x${string}`),
                ) as Promise<`0x${string}`>
            }
            if (isHex(message.raw)) {
                return signer.signMessage(hexToBytes(message.raw)) as Promise<`0x${string}`>
            }
            if (isBytes(message.raw)) {
                const sig = await signer.signMessage(message.raw)
                return sig as `0x${string}`
            }
            throw new Error('Unsupported message format')
        },
        signTransaction: async (args) => {
            return signer.signTransaction(
                args as providers.TransactionRequest,
            ) as Promise<`0x${string}`>
        },
        signTypedData: async (args) => {
            if ('_signTypedData' in signer && typeof signer._signTypedData === 'function') {
                return signer._signTypedData(
                    args.domain as TypedDataDomain,
                    args.types as Record<string, TypedDataField[]>,
                    args.message as Record<string, unknown>,
                ) as Promise<`0x${string}`>
            }
            throw new Error('Unsupported signer type')
        },
    })
}
