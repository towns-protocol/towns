import type { Address, Hex } from 'viem'
import { keccak256 } from 'viem'
import { baseSepolia, base } from 'viem/chains'
import type { BasePayload, BotHandler } from './bot'
import type { Network, Price } from '@x402/core/types'
import { InteractionRequestPayload_Signature_SignatureType } from '@towns-protocol/proto'

/**
 * x402 v2 Network type using CAIP-2 format
 * Format: "namespace:reference" (e.g., "eip155:8453" for Base mainnet)
 */
export type X402Network = Network

/**
 * Supported EVM networks with their CAIP-2 identifiers
 */
export const EVM_NETWORKS = {
    base: 'eip155:8453' as X402Network,
    'base-sepolia': 'eip155:84532' as X402Network,
    ethereum: 'eip155:1' as X402Network,
    'ethereum-sepolia': 'eip155:11155111' as X402Network,
    arbitrum: 'eip155:42161' as X402Network,
    optimism: 'eip155:10' as X402Network,
    polygon: 'eip155:137' as X402Network,
} as const

/**
 * Supported Solana networks with their CAIP-2 identifiers
 */
export const SOLANA_NETWORKS = {
    'solana-mainnet': 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as X402Network,
    'solana-devnet': 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1' as X402Network,
} as const

/**
 * All supported networks
 */
export const SUPPORTED_NETWORKS = {
    ...EVM_NETWORKS,
    ...SOLANA_NETWORKS,
} as const

export type SupportedNetworkName = keyof typeof SUPPORTED_NETWORKS

/**
 * USDC contract addresses per chain ID
 */
export const USDC_ADDRESSES: Record<number, Address> = {
    [baseSepolia.id]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    // Ethereum mainnet USDC
    1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    // Ethereum Sepolia USDC (Circle)
    11155111: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    // Arbitrum One USDC
    42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    // Optimism USDC
    10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    // Polygon USDC
    137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
}

/**
 * Solana USDC token addresses
 */
export const SOLANA_USDC_ADDRESSES: Record<string, string> = {
    'solana-mainnet': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    'solana-devnet': '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
}

/**
 * Session configuration for pay-once-use-many functionality
 */
export interface SessionConfig {
    /** Session duration in seconds (default: 3600 = 1 hour) */
    duration?: number
    /** Maximum number of uses per session (undefined = unlimited) */
    maxUses?: number
}

/**
 * Extended payment configuration for x402 v2
 * Supports multi-chain and session-based payments
 */
export interface PaymentConfig {
    /** Price in USDC (e.g., "$1.00", 1.50, "0.25") */
    price: Price
    /** Supported networks (defaults to current chain) */
    networks?: X402Network[]
    /** Session configuration for reusable access */
    session?: SessionConfig
    /** Custom payment recipient (defaults to bot's app address) */
    payTo?: Address
}

/**
 * Active session tracking
 */
export interface ActiveSession {
    userId: string
    command: string
    /** Network where the session payment was made (CAIP-2) */
    network: X402Network
    expiresAt: number
    usesRemaining: number | undefined
    transactionHash: string
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
    /** Session config if this is a session-enabled payment */
    sessionConfig?: SessionConfig
}

/**
 * Convert chain ID to CAIP-2 network identifier (x402 v2 format)
 */
export function chainIdToNetwork(chainId: number): X402Network {
    switch (chainId) {
        case base.id:
            return EVM_NETWORKS.base
        case baseSepolia.id:
            return EVM_NETWORKS['base-sepolia']
        case 1:
            return EVM_NETWORKS.ethereum
        case 11155111:
            return EVM_NETWORKS['ethereum-sepolia']
        case 42161:
            return EVM_NETWORKS.arbitrum
        case 10:
            return EVM_NETWORKS.optimism
        case 137:
            return EVM_NETWORKS.polygon
        default:
            throw new Error(`Unsupported chain ID: ${chainId}`)
    }
}

/**
 * Convert CAIP-2 network identifier to chain ID
 */
export function networkToChainId(network: X402Network): number {
    switch (network) {
        case EVM_NETWORKS.base:
            return base.id
        case EVM_NETWORKS['base-sepolia']:
            return baseSepolia.id
        case EVM_NETWORKS.ethereum:
            return 1
        case EVM_NETWORKS['ethereum-sepolia']:
            return 11155111
        case EVM_NETWORKS.arbitrum:
            return 42161
        case EVM_NETWORKS.optimism:
            return 10
        case EVM_NETWORKS.polygon:
            return 137
        default:
            throw new Error(`Unsupported network: ${network}`)
    }
}

/**
 * Check if a network is an EVM network
 */
export function isEvmNetwork(network: X402Network): boolean {
    return network.startsWith('eip155:')
}

/**
 * Check if a network is a Solana network
 */
export function isSolanaNetwork(network: X402Network): boolean {
    return network.startsWith('solana:')
}

export function getUsdcAddress(chainId: number): Address {
    const address = USDC_ADDRESSES[chainId]
    if (!address) {
        throw new Error(`USDC address not found for chain ID: ${chainId}`)
    }
    return address
}

/**
 * Get USDC address for a CAIP-2 network
 */
export function getUsdcAddressForNetwork(network: X402Network): string {
    if (isEvmNetwork(network)) {
        const chainId = networkToChainId(network)
        return getUsdcAddress(chainId)
    } else if (isSolanaNetwork(network)) {
        const networkName = Object.entries(SOLANA_NETWORKS).find(
            ([, n]) => n === network,
        )?.[0] as keyof typeof SOLANA_USDC_ADDRESSES
        if (networkName && SOLANA_USDC_ADDRESSES[networkName]) {
            return SOLANA_USDC_ADDRESSES[networkName]
        }
        throw new Error(`USDC address not found for Solana network: ${network}`)
    }
    throw new Error(`Unsupported network type: ${network}`)
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
    paymentConfig: PaymentConfig,
    command: string,
) {
    const usdcAddr = getUsdcAddress(chainId)
    const nonce = generateNonce()
    const { validAfter, validBefore } = getValidityWindow()
    const value = parseUSDCPrice(paymentConfig.price)

    const params: TransferAuthorizationParams = {
        from: fromAddress,
        to: paymentConfig.payTo ?? recipientAddress,
        value: value,
        validAfter,
        validBefore,
        nonce,
        chainId: chainId,
        verifyingContract: usdcAddr,
    }

    const typedData = buildTransferAuthorizationTypedDataForSigning(params)
    const signatureId = `payment-${Date.now()}-${nonce.slice(0, 10)}`

    // Format price for display
    const priceDisplay =
        typeof paymentConfig.price === 'string' || typeof paymentConfig.price === 'number'
            ? String(paymentConfig.price)
            : JSON.stringify(paymentConfig.price)

    // Build title with session info if applicable
    let title = `Payment Required for /${command} • ${priceDisplay} USDC`
    if (paymentConfig.session) {
        const duration = paymentConfig.session.duration ?? 3600
        const hours = Math.floor(duration / 3600)
        const mins = Math.floor((duration % 3600) / 60)
        const durationStr = hours > 0 ? `${hours}h${mins > 0 ? ` ${mins}m` : ''}` : `${mins}m`
        title += ` (${durationStr} session)`
    }

    const result = await handler.sendInteractionRequest(event.channelId, {
        case: 'signature',
        value: {
            id: signatureId,
            type: InteractionRequestPayload_Signature_SignatureType.TYPED_DATA,
            data: JSON.stringify(typedData),
            chainId: params.chainId.toString(),
            signerWallet: fromAddress,
            title,
            subtitle: paymentConfig.session
                ? `Sign to authorize payment for session access`
                : `Sign to authorize payment`,
        },
    })

    return {
        signatureId,
        params,
        eventId: result.eventId,
        sessionConfig: paymentConfig.session,
    }
}

/**
 * Parses a USDC price to atomic units (6 decimals).
 * Handles dollar signs, commas, and decimal amounts.
 * Only string and number inputs are supported.
 *
 * @example
 * parseUSDCPrice("$1.00")     // 1000000n
 * parseUSDCPrice(1.50)        // 1500000n
 * parseUSDCPrice("$1,000.00") // 1000000000n
 */
export function parseUSDCPrice(price: Price): bigint {
    if (typeof price !== 'string' && typeof price !== 'number') {
        throw new Error(
            `parseUSDCPrice only supports string or number inputs, got: ${typeof price}`,
        )
    }

    const rawStr = String(price)
    const sanitized = rawStr.replace(/[$,\s]/g, '').trim()

    if (!/^\d+(\.\d{0,6})?$/.test(sanitized)) {
        throw new Error(`Invalid USDC price format: ${JSON.stringify(price)}`)
    }

    const [whole, frac = ''] = sanitized.split('.')
    const paddedFrac = frac.padEnd(6, '0').slice(0, 6)

    return BigInt(whole || '0') * 1_000_000n + BigInt(paddedFrac)
}

/**
 * Generate a session key for tracking active sessions
 */
export function getSessionKey(userId: string, command: string): string {
    return `${userId}:${command}`
}

/**
 * Validate that the current chain ID is supported by the payment configuration
 * @throws Error if network is not supported
 */
export function validateNetworkSupport(chainId: number, paymentConfig: PaymentConfig): void {
    // If no networks specified, all supported networks are allowed
    if (!paymentConfig.networks || paymentConfig.networks.length === 0) {
        return
    }

    let currentNetwork: X402Network
    try {
        currentNetwork = chainIdToNetwork(chainId)
    } catch (err: unknown) {
        const errorMessage =
            err instanceof Error ? err.message : typeof err === 'string' ? err : String(err)
        throw new Error(`Unsupported chain ID ${chainId}: ${errorMessage}`)
    }

    if (!paymentConfig.networks.includes(currentNetwork)) {
        const supportedNetworks = paymentConfig.networks.join(', ')
        throw new Error(
            `Chain ID ${chainId} (${currentNetwork}) is not supported for this command. ` +
                `Supported networks: ${supportedNetworks}`,
        )
    }
}
