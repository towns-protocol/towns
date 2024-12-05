import { env } from 'utils'
import { axiosClient } from './apiClient'

interface CrossmintResponse {
    id: string
    status: string
}

export const registerContractWithCrossmint = async (
    contractAddress: string,
): Promise<CrossmintResponse> => {
    const response = await axiosClient.post(
        `${env.VITE_GATEWAY_URL}/crossmint/register-contract`,
        { contractAddress },
        { withCredentials: true },
    )

    return response.data
}
