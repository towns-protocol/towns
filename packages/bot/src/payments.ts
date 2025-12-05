import type { Address, Hex } from 'viem'
import { keccak256 } from 'viem'
import { baseSepolia, base } from 'viem/chains'
import { useFacilitator } from 'x402/verify'
import type { BasePayload, BotHandler } from './bot'
import type { Price, RouteConfig } from 'x402/types'

export const USDC_ADDRESSES: Record<number, Address> = {
    [baseSepolia.id]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
}

export interface PendingPayment {
    command: string
    channelId: string
    userId: string
    /** The eventId of the interaction request message (to delete after signing) */
    interactionEventId: string
    event: BasePayload & {
        command: string
        args: string[]
        mentions: any[]
        replyId: string | undefined
        threadId: string | undefined
    }
    params: TransferAuthorizationParams
}

export function chainIdToNetwork(chainId: number): 'base' | 'base-sepolia' {
    switch (chainId) {
        case base.id:
            return 'base'
        case baseSepolia.id:
            return 'base-sepolia'
        default:
            throw new Error(`Unsupported chain ID: ${chainId}`)
    }
}

export function getUsdcAddress(chainId: number): Address {
    const address = USDC_ADDRESSES[chainId as keyof typeof USDC_ADDRESSES]
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
    event: BasePayload,
    chainId: number,
    fromAddress: Address,
    recipientAddress: Address,
    paymentConfig: RouteConfig,
    command: string,
) {
    const usdcAddr = getUsdcAddress(chainId)
    const nonce = generateNonce()
    const { validAfter, validBefore } = getValidityWindow()
    const value = parseUSDCPrice(paymentConfig.price)

    const params: TransferAuthorizationParams = {
        from: fromAddress,
        to: recipientAddress,
        value: value,
        validAfter,
        validBefore,
        nonce,
        chainId: chainId,
        verifyingContract: usdcAddr,
    }

    const typedData = buildTransferAuthorizationTypedDataForSigning(params)
    const signatureId = `payment-${Date.now()}-${nonce.slice(0, 10)}`

    const result = await handler.sendInteractionRequest(event.channelId, {
        case: 'signature',
        value: {
            id: signatureId,
            type: 1, // TYPED_DATA
            data: JSON.stringify(typedData),
            chainId: params.chainId.toString(),
            signerWallet: fromAddress,
            title: `Payment Required for /${command} • ${paymentConfig.price} USDC`,
            subtitle: `Sign to authorize payment`,
        },
    })

    return {
        signatureId,
        params,
        eventId: result.eventId,
    }
}

/**
 * Parses a USDC price to atomic units (6 decimals).
 * Handles dollar signs, commas, and decimal amounts.
 *
 * @example
 * parseUSDCPrice("$1.00")     // 1000000n
 * parseUSDCPrice(1.50)        // 1500000n
 * parseUSDCPrice("$1,000.00") // 1000000000n
 * parseUSDCPrice({ amount: 100 }) // attempts JSON parsing
 */
export function parseUSDCPrice(price: Price): bigint {
    // Handle string/number directly, otherwise try JSON serialization
    const rawStr =
        typeof price === 'string' || typeof price === 'number'
            ? String(price)
            : JSON.stringify(price)

    const sanitized = rawStr.replace(/[$,\s]/g, '').trim()

    if (!/^\d+(\.\d{0,6})?$/.test(sanitized)) {
        throw new Error(`Invalid USDC price format: ${JSON.stringify(price)}`)
    }

    const [whole, frac = ''] = sanitized.split('.')
    const paddedFrac = frac.padEnd(6, '0').slice(0, 6)

    return BigInt(whole || '0') * 1_000_000n + BigInt(paddedFrac)
}
