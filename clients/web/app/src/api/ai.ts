import { env } from 'utils'
import { axiosClient } from './apiClient'

interface ValidationResult {
    valid: boolean
    reason?: string
}

interface TownContext {
    name: string
    description?: string
}

export const moderateReview = async (
    text: string,
    townContext: TownContext,
): Promise<ValidationResult> => {
    const response = await axiosClient.post(
        `${env.VITE_GATEWAY_URL}/ai/moderate-review`,
        { text, townContext },
        { withCredentials: true },
    )

    return response.data
}
