import { Address } from 'use-towns-client'
import { isAddress } from 'ethers/lib/utils'
import { z } from 'zod'

const BASE_ETH = 'BASE_ETH'

const assetToTransfer = z.union([
    z.literal(BASE_ETH),
    z.custom<Address>((val) => typeof val === 'string' && isAddress(val)),
])

const address = z.custom<Address>((val) => typeof val === 'string' && isAddress(val))

const ethAmount = z.string().optional()

export const transferSchema = z
    .object({
        assetToTransfer: assetToTransfer.optional(),
        recipient: address.optional(),
        ethAmount: ethAmount.optional(),
        tokenId: z.string().optional(),
    })
    .superRefine((data, ctx) => {
        const ethAmountAsNumber = Number(data['ethAmount'])
        const asset = data['assetToTransfer']
        const isEthAsset = asset === BASE_ETH

        if (isEthAsset) {
            if (isNaN(ethAmountAsNumber)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Please enter a valid number.',
                    path: ['ethAmount'],
                })
            }

            if (ethAmountAsNumber === 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Please enter a number greater than 0.`,
                    path: ['ethAmount'],
                })
            }
        }
    })

export type TransferSchema = z.infer<typeof transferSchema>
