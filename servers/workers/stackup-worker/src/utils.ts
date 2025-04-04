/* eslint-disable @typescript-eslint/no-base-to-string */
import { Request as IttyRequest } from 'itty-router'
import {
    GasOverrides,
    isHexString,
    isEntrypoinV06SponsorshipRequest,
    isEntrypointV07SponsorshipRequest,
    SponsorshipRequest,
} from './types'
import { Address } from '@towns-protocol/web3'
import { ApiErrorDetail, ErrorCode } from './createResponse'
import {
    entryPoint06Address,
    entryPoint07Address,
    RpcUserOperation,
} from 'viem/account-abstraction'

export type WorkerRequest = Request & IttyRequest

export const durationLogger = (step: string) => {
    const now = Date.now()
    console.log(`DURATION START: ${step}`, `Timestamp: ${now}`)
    return () => {
        const end = Date.now()
        const duration = end - now
        console.log(`DURATION END: ${step}`, duration, `Timestamp: ${end}`)
    }
}

export function createPMSponsorUserOperationRequest(params: {
    sponsorshipReq: SponsorshipRequest<'0.6'> | SponsorshipRequest<'0.7'>
}): RequestInit {
    const { sponsorshipReq } = params
    const { data } = sponsorshipReq
    const { gasOverrides, functionHash, rootKeyAddress, townId, ...userOp } = data
    const init = {
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'pm_sponsorUserOperation',
            params: [
                {
                    ...userOp,
                } satisfies RpcUserOperation,
                isEntrypoinV06SponsorshipRequest(sponsorshipReq)
                    ? entryPoint06Address
                    : entryPoint07Address,
            ],
        }),
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            accept: 'application/json',
        },
    }
    return init
}

export function createAlchemyRequestGasAndPaymasterDataRequest(args: {
    policyId: string
    sponsorshipReq: SponsorshipRequest<'0.6'> | SponsorshipRequest<'0.7'>
}) {
    const { policyId, sponsorshipReq } = args
    const { gasOverrides } = sponsorshipReq.data

    const fallbackMultiplier = 1.2

    const overrides: Record<string, string | { multiplier: number }> = {
        maxFeePerGas: gasOverrides?.maxFeePerGas?.toString() ?? { multiplier: fallbackMultiplier },
        maxPriorityFeePerGas: gasOverrides?.maxPriorityFeePerGas?.toString() ?? {
            multiplier: fallbackMultiplier,
        },
        callGasLimit: gasOverrides?.callGasLimit?.toString() ?? { multiplier: fallbackMultiplier },
        verificationGasLimit: gasOverrides?.verificationGasLimit?.toString() ?? {
            multiplier: fallbackMultiplier,
        },
        preVerificationGas: gasOverrides?.preVerificationGas?.toString() ?? {
            multiplier: fallbackMultiplier,
        },
    }

    type AlchemyRequestGasAndPaymasterDataParams = [
        {
            policyId: string
            entryPoint: string
            dummySignature: string
            userOperation: Record<string, string | undefined>
            overrides: Record<string, string | { multiplier: number }>
        },
    ]

    let params: AlchemyRequestGasAndPaymasterDataParams | undefined = undefined

    if (isEntrypoinV06SponsorshipRequest(sponsorshipReq)) {
        const { sender, nonce, initCode, callData, signature } = sponsorshipReq.data
        params = [
            {
                policyId,
                entryPoint: entryPoint06Address,
                dummySignature: signature,
                // don't add gas fields here
                userOperation: {
                    sender,
                    nonce,
                    initCode,
                    callData,
                },
                overrides,
            },
        ]
    } else if (isEntrypointV07SponsorshipRequest(sponsorshipReq)) {
        const { sender, nonce, factory, factoryData, callData, signature } = sponsorshipReq.data

        params = [
            {
                policyId,
                entryPoint: entryPoint07Address,
                dummySignature: signature,
                // don't add gas fields here
                userOperation: {
                    sender,
                    nonce,
                    factory,
                    factoryData,
                    callData,
                },
                overrides,
            },
        ]
    }

    if (!params) {
        throw new Error('Invalid user operation')
    }

    // https://docs.alchemy.com/reference/alchemy-requestgasandpaymasteranddata
    const init = {
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'alchemy_requestGasAndPaymasterAndData',
            params,
        }),
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            accept: 'application/json',
        },
    }
    return init
}

export async function getJson(request: WorkerRequest): Promise<object | null> {
    let content = {}
    try {
        content = await request.json()
        return content
    } catch (e) {
        console.error('Bad request with non-json content', e)
    }
    return null
}

export function commonChecks(args: { rootKeyAddress: string; sender: string }): {
    errorDetail?: ApiErrorDetail
    root: Address
    sender: Address
} {
    const { rootKeyAddress, sender } = args
    let errorDetail: ApiErrorDetail | undefined
    if (!isHexString(rootKeyAddress)) {
        errorDetail = {
            code: ErrorCode.INVALID_ROOT_KEY,
            description: `rootKeyAddress ${rootKeyAddress} not valid`,
        }
    }
    if (!isHexString(sender)) {
        errorDetail = {
            code: ErrorCode.INVALID_SENDER,
            description: `userOperation.sender ${sender} not valid`,
        }
    }
    if ('townId' in args && args.townId === undefined) {
        errorDetail = {
            code: ErrorCode.INVALID_SPACE,
            description: `Missing townId, cannot verify that town exists`,
        }
    }
    return {
        errorDetail,
        root: rootKeyAddress as Address,
        sender: sender as Address,
    }
}

export function toJson(data: object | undefined) {
    return JSON.stringify(data)
}

export const invalidTownErrorMessage = toJson({
    error: `Missing townId, cannot verify town exists`,
})
