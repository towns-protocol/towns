import { type Address, type Hex, keccak256 } from 'viem'
import type { BotHandler, BasePayload } from '../bot'

// Chain IDs
export const BASE_CHAIN_ID = 8453
export const BASE_SEPOLIA_CHAIN_ID = 84532

// USDC addresses per chain
export const USDC_ADDRESSES: Record<number, Address> = {
    [BASE_CHAIN_ID]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base mainnet
    [BASE_SEPOLIA_CHAIN_ID]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia
}

// Map chain ID to x402 network name
export function chainIdToNetwork(chainId: number): 'base' | 'base-sepolia' {
    switch (chainId) {
        case BASE_CHAIN_ID:
            return 'base'
        case BASE_SEPOLIA_CHAIN_ID:
            return 'base-sepolia'
        default:
            throw new Error(`Unsupported chain ID: ${chainId}`)
    }
}

// Get USDC address for a chain
export function getUsdcAddress(chainId: number): Address {
    const address = USDC_ADDRESSES[chainId]
    if (!address) {
        throw new Error(`USDC address not found for chain ID: ${chainId}`)
    }
    return address
}

// Type definitions
export interface TransferAuthorizationParams {
    from: Address
    to: Address
    value: bigint
    validAfter: bigint
    validBefore: bigint
    nonce: Hex
    chainId: number
    verifyingContract: Address
}

export interface TypedData {
    types: {
        [key: string]: Array<{ name: string; type: string }>
    }
    domain: {
        name: string
        version: string
        chainId: number
        verifyingContract: Address
    }
    primaryType: string
    message: {
        [key: string]: any
    }
}

/**
 * Generate a unique nonce for USDC authorization
 * Uses crypto-safe random bytes
 */
export function generateNonce(): Hex {
    const randomBytes = crypto.getRandomValues(new Uint8Array(32))
    return keccak256(randomBytes)
}

/**
 * Get validity window for authorization
 * validAfter: current timestamp
 * validBefore: current timestamp + 1 hour
 */
export function getValidityWindow(): {
    validAfter: bigint
    validBefore: bigint
} {
    const now = BigInt(Math.floor(Date.now() / 1000))
    return {
        validAfter: now,
        validBefore: now + 3600n, // 1 hour
    }
}

/**
 * Build EIP-712 typed data for USDC transferWithAuthorization signature request
 * Synchronous version for sending to client - no contract calls needed
 */
export function buildTransferAuthorizationTypedDataForSigning(
    params: TransferAuthorizationParams,
): TypedData {
    return {
        types: {
            TransferWithAuthorization: [
                { name: 'from', type: 'address' },
                { name: 'to', type: 'address' },
                { name: 'value', type: 'uint256' },
                { name: 'validAfter', type: 'uint256' },
                { name: 'validBefore', type: 'uint256' },
                { name: 'nonce', type: 'bytes32' },
            ],
        },
        domain: {
            name: 'USDC',
            version: '2',
            chainId: params.chainId,
            verifyingContract: params.verifyingContract,
        },
        primaryType: 'TransferWithAuthorization',
        message: {
            from: params.from,
            to: params.to,
            value: params.value.toString(),
            validAfter: params.validAfter.toString(),
            validBefore: params.validBefore.toString(),
            nonce: params.nonce,
        },
    }
}

/**
 * Simplified payment request builder
 * Returns all data needed to track and verify the payment
 */
export async function createPaymentRequest(
    handler: BotHandler,
    payload: BasePayload,
    fromAddress: Address,
    recipientAddress: Address,
    amount: bigint,
    title: string,
    subtitle?: string,
    chainId?: number,
    usdcAddress?: Address,
) {
    if (!chainId) {
        throw new Error('chainId is required')
    }

    const usdcAddr = usdcAddress || getUsdcAddress(chainId)
    const nonce = generateNonce()
    const { validAfter, validBefore } = getValidityWindow()
    const signatureId = `payment-${Date.now()}-${nonce.slice(0, 10)}`

    const params: TransferAuthorizationParams = {
        from: fromAddress,
        to: recipientAddress,
        value: amount,
        validAfter,
        validBefore,
        nonce,
        chainId: chainId,
        verifyingContract: usdcAddr,
    }

    const typedData = buildTransferAuthorizationTypedDataForSigning(params)

    const result = await handler.sendInteractionRequest(payload.channelId, {
        case: 'signature',
        value: {
            id: signatureId,
            type: 1, // TYPED_DATA
            data: JSON.stringify(typedData),
            chainId: params.chainId.toString(),
            signerWallet: fromAddress,
            title,
            ...(subtitle && { subtitle }),
        },
    })

    return {
        ...result,
        signatureId,
        params,
    }
}
