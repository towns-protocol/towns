import axios, { AxiosError, AxiosHeaders } from 'axios'
import { env } from 'utils'

export const axiosClient = axios.create({
    headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.VITE_AUTH_WORKER_HEADER_SECRET}`,
    },
})

export const errorHasInvalidCookieResponseHeader = (error: unknown) => {
    if (error instanceof AxiosError) {
        if (error.response?.headers instanceof AxiosHeaders) {
            return error.response.headers.has('x-invalid-cookie')
        }
    }
}
