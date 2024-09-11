import { getAccessToken } from '@privy-io/react-auth'

export async function retryGetAccessToken(
    maxRetries: number,
    initialDelay: number = 1000,
    factor: number = 2,
): Promise<string | null> {
    let attempt = 0
    let delayTime = initialDelay

    while (attempt < maxRetries) {
        try {
            const result = await getAccessToken()
            if (result) {
                return result
            }
            throw new Error("getAccessToken didn't return a token")
        } catch (error) {
            if (attempt === maxRetries - 1) {
                throw error
            }
            await new Promise((resolve) => setTimeout(resolve, delayTime))
            delayTime *= factor
            attempt++
        }
    }

    throw new Error(`Failed after ${maxRetries} retries`)
}
