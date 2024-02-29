import { IUserOperation } from 'userop.js'
import { Request as IttyRequest } from 'itty-router'

export type WorkerRequest = Request & IttyRequest

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
