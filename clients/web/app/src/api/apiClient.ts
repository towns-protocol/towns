import axios from 'axios'
import { env } from 'utils'

export const axiosClient = axios.create({
    headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.VITE_AUTH_WORKER_HEADER_SECRET}`,
    },
})
