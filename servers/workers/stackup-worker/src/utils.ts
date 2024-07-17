import { IUserOperation } from 'userop.js'
import { Request as IttyRequest } from 'itty-router'
import { isHexString } from './types'
import { Address } from '@river-build/web3'

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

export function createPmSponsorUserOperationRequest(params: {
    userOperation: IUserOperation
    paymasterAddress: string
    type: { type: string }
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

export function commonChecks(args: { rootKeyAddress: string; sender: string }) {
    const { rootKeyAddress, sender } = args
    let errorMessage: string | undefined
    if (!isHexString(rootKeyAddress)) {
        errorMessage = `rootKeyAddress ${rootKeyAddress} not valid`
    }
    if (!isHexString(sender)) {
        errorMessage = `userOperation.sender ${sender} not valid`
    }
    if ('townId' in args && args.townId === undefined) {
        errorMessage = `Missing townId, cannot verify that town exists`
    }
    return {
        errorMessage,
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
