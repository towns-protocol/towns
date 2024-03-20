import { z } from 'zod'
import { TokenType } from '../types'

export const tokenIdSchema = z.object({
    tokenId: z.number({
        required_error: 'Please enter a number',
        invalid_type_error: 'Please enter a number',
    }),
})

export const tokenEntitlementSchema = z.object({
    address: z.string(),
    tokenIds: z.array(
        z.number({
            required_error: 'Please enter a number',
            invalid_type_error: 'Please enter a number',
        }),
    ),
    chainId: z.number(),
    quantity: z.number(),
    type: z.nativeEnum(TokenType),
})

export type TokenEntitlement = z.infer<typeof tokenEntitlementSchema>
