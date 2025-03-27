import { Request as IttyRequest } from 'itty-router'

export type WorkerRequest = Request & IttyRequest

export function toJson(data: object | undefined) {
    return JSON.stringify(data)
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
