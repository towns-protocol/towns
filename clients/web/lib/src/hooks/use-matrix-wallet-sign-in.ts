import { useMemo } from 'react'

import { SiweMessage } from 'siwe'
import { useWeb3Context } from '../components/Web3ContextProvider'
import { useNetwork } from 'wagmi'

export function useMatrixWalletSignIn() {
    const { chain } = useWeb3Context()
    const { chain: walletChain } = useNetwork()
    // `chain` is the chain we initialize the lib to
    // `walletChain` is the user's current chain in their wallet extension
    // Though we use `chain` to sign the message, (allowing user to sign in on correct network for lib, regardless of chain in wallet),
    // for greater transparency and less confusion, this prop is provided for clients to implement their own UX for this scenario
    const userOnWrongNetworkForSignIn = useMemo(() => {
        return chain?.id !== walletChain?.id
    }, [walletChain, chain])

    return {
        userOnWrongNetworkForSignIn,
    }
}

function getAuthority(uri: string): string {
    const url = new URL(uri)
    return url.port ? `${url.hostname}:${url.port}` : url.hostname
}

/**
 * Create a message for signing. See https://eips.ethereum.org/EIPS/eip-4361
 * for message template.
 */
export function createMessageToSign(args: {
    walletAddress: string | undefined
    chainId: number
    statement: string
}): string {
    /**
        // EIP-4361 message template:
        authority: string // is the RFC 3986 authority that is requesting the signing.
        address: string // is the Ethereum address performing the signing conformant to capitalization encoded checksum specified in EIP-55 where applicable.
        version: string // version of the Matrix public key spec that the client is complying with.
        chainId: number // is the EIP-155 Chain ID to which the session is bound, and the network where Contract Accounts must be resolved.
        statement: string // is a human-readable ASCII assertion that the user will sign, and it must not contain '\n' (the byte 0x0a).
        uri: string // is an RFC 3986 URI referring to the resource that is the subject of the signing
    */
    const siweMessage = new SiweMessage({
        domain: getAuthority(window.location.origin),
        address: args.walletAddress,
        statement: args.statement,
        uri: window.location.origin,
        version: '1',
        chainId: args.chainId,
        nonce: '', // Auto-generate.
    })

    console.log(`[createMessageToSign][SiweMessage]`, siweMessage)

    const messageToSign = siweMessage.prepareMessage()
    console.log(`[createMessageToSign][siweMessage.prepareMessage]`, messageToSign)

    return messageToSign
}
