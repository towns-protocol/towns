import { IUserOperation } from 'userop.js'
import { Request as IttyRequest } from 'itty-router'
import { GasOverrides, isHexString } from './types'
import { Address } from '@river-build/web3'
import { ApiErrorDetail, ErrorCode } from './createResponse'

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
    userOperation: IUserOperation
    entryPoint: string
}): RequestInit {
    const init = {
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'pm_sponsorUserOperation',
            params: Object.values(params),
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
    entryPoint: string
    userOperation: IUserOperation
    gasOverrides?: GasOverrides
}) {
    const { policyId, entryPoint, userOperation, gasOverrides } = args

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

    // https://docs.alchemy.com/reference/alchemy-requestgasandpaymasteranddata
    const init = {
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'alchemy_requestGasAndPaymasterAndData',
            params: [
                {
                    policyId,
                    entryPoint,
                    dummySignature: userOperation.signature,
                    // don't add gas fields here
                    userOperation: {
                        sender: userOperation.sender,
                        nonce: userOperation.nonce,
                        initCode: userOperation.initCode,
                        callData: userOperation.callData,
                    },
                    overrides,
                },
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

export async function getContentAsJson(request: WorkerRequest): Promise<object | null> {
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
