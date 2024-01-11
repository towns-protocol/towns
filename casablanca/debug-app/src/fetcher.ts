import { makeStreamRpcClient } from '@river/sdk'

export const fetchData = async (url: string): Promise<string> => {
    const options: RequestInit = {
        method: 'GET',
        headers: {
            'Content-Type': 'text/plain',
        },
    }

    try {
        const response = await fetch(url, options)
        console.log('Response headers:', response)
        const data = await response.text()
        console.log('Response data:', data)
        return data
    } catch (error) {
        console.error('Error:', error)
        throw error
    }
}

export const fetchRpcInfo = async (url: string): Promise<string> => {
    const client = makeStreamRpcClient(url)
    const result = await client.info({ debug: ['ping!'] })
    console.log('Result:', result)
    return result.toJsonString()
}
