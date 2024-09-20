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
    quantity: z.bigint(),
    type: z.nativeEnum(TokenType),
})

export const tokenSchema = z.object({
    chainId: z.number(),
    data: z.object({
        address: z.string(),
        type: z.nativeEnum(TokenType),
        name: z.string().optional(),
        symbol: z.string().optional(),
        imageUrl: z.string().optional(),
        openSeaCollectionUrl: z.string().optional(),
        quantity: z.string().optional(),
        decimals: z.number().optional(),
        imgSrc: z.string().optional(),
        label: z.string().optional(),
        tokenId: z.string().optional(),
    }),
})

export type TokenEntitlement = z.infer<typeof tokenEntitlementSchema>

export type Token = z.infer<typeof tokenSchema>
