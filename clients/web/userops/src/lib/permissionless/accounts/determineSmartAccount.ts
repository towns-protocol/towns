import { z } from 'zod'
import { SmartAccountType } from '../../../types'
import { Address, isAddress } from 'viem'

type DetermineSmartAccountResponse = {
    accountType: SmartAccountType
    address: Address
}

const zAddress = z.custom<Address>((val) => typeof val === 'string' && isAddress(val))

const zSuccessSchema: z.ZodType<{
    data: DetermineSmartAccountResponse
}> = z.object({
    data: z.object({
        accountType: z.enum(['simple', 'modular']),
        address: zAddress,
    }),
})

export async function determineSmartAccount({
    newAccountImplementationType,
    paymasterProxyUrl,
    paymasterProxyAuthSecret,
    ownerAddress,
}: {
    newAccountImplementationType: SmartAccountType
    paymasterProxyUrl: string
    paymasterProxyAuthSecret: string
    ownerAddress: string
}): Promise<DetermineSmartAccountResponse> {
    const maxRetries = 3
    const baseDelay = 1000

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const url = new URL(paymasterProxyUrl)
            url.pathname = `/api/smart-account/${ownerAddress}`
            url.searchParams.set('newAccountImplementationType', newAccountImplementationType)
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${paymasterProxyAuthSecret}`,
                },
            })
            const json: unknown = await response.json()

            const parseResult = zSuccessSchema.safeParse(json)
            if (!parseResult.success) {
                throw new Error('Invalid response from from /api/smart-account')
            }

            return parseResult.data.data
        } catch (error) {
            if (attempt === maxRetries - 1) {
                throw error
            }
            const delay = baseDelay * Math.pow(2, attempt)
            await new Promise((resolve) => setTimeout(resolve, delay))
        }
    }

    // This should never be reached due to the throw in the catch block
    throw new Error('Failed to determine smart account after all retries')
}
