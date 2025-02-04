import { z } from 'zod'

export const tokenAmountSchema = z.object({
    tokenAmount: z.string().refine((val) => !val || /^\d*\.?\d*$/.test(val), {
        message: 'Please enter a valid number',
    }),
})

export type TokenAmountSchema = z.infer<typeof tokenAmountSchema>
