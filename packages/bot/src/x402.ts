import type { PaymentPayloadV1, PaymentRequirementsV1 } from '@x402/core/types/v1'
import type { X402Network } from './payments'

/**
 * Coinbase-hosted x402 facilitator base URLs.
 *
 * - `X402_ORG_FACILITATOR_BASE_URL`: public/testnet endpoint (served from x402.org)
 * - `CDP_X402_BASE_URL`: Coinbase Developer Platform endpoint (likely mainnet/prod; requires auth)
 */
export const X402_ORG_FACILITATOR_BASE_URL = 'https://www.x402.org/facilitator'
export const CDP_X402_BASE_URL = 'https://api.cdp.coinbase.com/platform/v2/x402'

/**
 * x402 facilitator configuration.
 *
 * Note: This is specific to the facilitator HTTP API used by the bot payment flow.
 * It is NOT the same as the x402 client/server 402 flow headers (PAYMENT-SIGNATURE, etc).
 */
export interface FacilitatorConfig {
    /** Base URL of the facilitator service (e.g. https://facilitator.x402.org) */
    url: string
    /** Optional API key for authentication */
    apiKey?: string
    /**
     * Optional additional headers required by your facilitator.
     * (CDP may require headers beyond a simple Bearer token.)
     */
    headers?: Record<string, string>
}

/**
 * Input type accepted by `makeTownsBot` for enabling payments.
 *
 * - `true` enables payments using the default public facilitator base URL (`https://www.x402.org/facilitator`)
 * - `{ apiKey }` enables payments with an explicit facilitator URL + API key (if required)
 * - `{ url, apiKey }` uses a custom facilitator URL
 */
export type FacilitatorConfigInput = true | Partial<FacilitatorConfig>

export function normalizeFacilitatorConfig(
    input: FacilitatorConfigInput | undefined,
): FacilitatorConfig | undefined {
    if (!input) return undefined
    if (input === true) {
        // Default to the public x402.org facilitator base.
        return { url: X402_ORG_FACILITATOR_BASE_URL }
    }
    if (!input.url) {
        throw new Error(
            `paymentConfig.url is required. Example: paymentConfig: { url: 'https://<your-facilitator>', apiKey: process.env.X402_API_KEY }`,
        )
    }
    return {
        url: input.url,
        apiKey: input.apiKey,
        headers: input.headers,
    }
}

function joinUrl(baseUrl: string, path: string): string {
    const base = baseUrl.replace(/\/+$/, '')
    const p = path.startsWith('/') ? path : `/${path}`
    return `${base}${p}`
}

/**
 * Response from x402 facilitator verify endpoint.
 */
export interface FacilitatorVerifyResponse {
    isValid: boolean
    invalidReason?: string
}

/**
 * Response from x402 facilitator settle endpoint.
 */
export interface FacilitatorSettleResponse {
    success: boolean
    transaction?: string
    errorReason?: string
    network?: X402Network
}

/**
 * Call the x402 facilitator to verify a payment.
 *
 * Uses the v1 payload/requirements wire shape (per `@x402/core/types/v1`).
 */
export async function callFacilitatorVerify(
    config: FacilitatorConfig,
    paymentPayload: PaymentPayloadV1,
    paymentRequirements: PaymentRequirementsV1,
): Promise<FacilitatorVerifyResponse> {
    const response = await fetch(joinUrl(config.url, '/verify'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(config.headers ?? {}),
            ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify({ paymentPayload, paymentRequirements }),
    })

    if (!response.ok) {
        const error = await response.text()
        return { isValid: false, invalidReason: error }
    }

    return (await response.json()) as FacilitatorVerifyResponse
}

/**
 * Call the x402 facilitator to settle a payment.
 *
 * Uses the v1 payload/requirements wire shape (per `@x402/core/types/v1`).
 */
export async function callFacilitatorSettle(
    config: FacilitatorConfig,
    paymentPayload: PaymentPayloadV1,
    paymentRequirements: PaymentRequirementsV1,
): Promise<FacilitatorSettleResponse> {
    const response = await fetch(joinUrl(config.url, '/settle'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(config.headers ?? {}),
            ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify({ paymentPayload, paymentRequirements }),
    })

    if (!response.ok) {
        const error = await response.text()
        return { success: false, errorReason: error }
    }

    return (await response.json()) as FacilitatorSettleResponse
}
