import { z } from 'zod'
import { TokenType } from './types'
import { Address, isAddress } from 'viem'

export const tokenIdSchema = z.object({
    tokenId: z.number({
        required_error: 'Please enter a number',
        invalid_type_error: 'Please enter a number',
    }),
})

export const tokenSchema = z.object({
    address: z.custom<Address>((val) => typeof val === 'string' && isAddress(val)),
    tokenIds: z.array(z.number()),
    chainId: z.number(),
    quantity: z.number(),
    type: z.nativeEnum(TokenType),
})

export type TokenSchema = z.infer<typeof tokenSchema>

export const walletListSchema = z.array(
    z.custom<Address>((val) => typeof val === 'string' && isAddress(val)),
)
export type WalletList = z.infer<typeof walletListSchema>
