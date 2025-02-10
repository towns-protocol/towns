import axios from 'axios'
import { env } from 'utils'

const lifiApiClient = axios.create({
    baseURL: 'https://li.quest',
    headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-lifi-api-key': env.VITE_LIFI_API_KEY,
    },
})

export async function lifiRequest<T>(
    url: string,
    method: 'GET' | 'POST',
    params?: unknown,
): Promise<T> {
    switch (method) {
        case 'GET': {
            const result = await lifiApiClient.get<T>(url, { params })
            return result.data
        }
        case 'POST': {
            const result = await lifiApiClient.post<T>(url, params)
            return result.data
        }
    }
}
