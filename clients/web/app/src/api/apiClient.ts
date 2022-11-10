import axios from 'axios'

export const axiosClient = axios.create({
    headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
    },
})
