import axios from 'axios'

export const axiosClient = axios.create({
    headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_AUTH_WORKER_HEADER_SECRET}`,
    },
})
