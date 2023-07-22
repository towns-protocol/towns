/* eslint-disable  @typescript-eslint/no-explicit-any */
import { Env } from '.'

export const upsertImage = async (getUrl: URL, apiUrl: URL, request: any, env: Env) => {
    const getRequestInit = {
        method: 'GET',
        headers: {
            Authorization: 'Bearer ' + env.API_TOKEN,
        },
    }
    const getRequest = new Request(getUrl, getRequestInit)
    const response = await fetch(getRequest)
    console.log(`getRequest: ${JSON.stringify(getRequest)}, response: ${response.status}`)
    if (response.status === 200) {
        console.log(`image exists, delete`)
        const deleteRequestInit = {
            method: 'DELETE',
            headers: {
                Authorization: 'Bearer ' + env.API_TOKEN,
            },
        }
        try {
            const deleteResponse = await fetch(new Request(apiUrl, deleteRequestInit))
            console.log(`delete response ${apiUrl} ${deleteResponse.status}`)
        } catch (error) {
            return new Response(JSON.stringify({ error: (error as Error).message }), {
                status: 500,
            })
        }
    }
    // ensure we only pass 'id' and 'file' lest cloudflare return errors
    const clone = request.clone()
    const formData = await clone.formData()
    const cfFormData = new FormData()
    cfFormData.append('id', formData.get('id') ?? '')
    cfFormData.append('file', formData.get('file') ?? '')

    try {
        const resp = await fetch(
            new URL([env.CF_API, env.ACCOUNT_ID, 'images/v1'].join('/')).toString(),
            {
                method: 'POST',
                headers: {
                    Authorization: 'Bearer ' + env.API_TOKEN,
                },
                body: cfFormData,
                cf: { cacheTtl: 0 },
            },
        )
        const cache = caches.default
        await cache.delete(getRequest)
        return resp
    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 500,
        })
    }
}
