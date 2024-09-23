import { z } from 'zod'
import { tokenSchema } from '@components/Tokens/TokenSelector/tokenSchemas'

const gatingTypeErrorMessage = 'Please choose who can join your town.'

export const gatingSchema = z
    .object({
        gatingType: z.union([
            z.literal('everyone', {
                errorMap: (_err, _ctx) => {
                    return { message: gatingTypeErrorMessage }
                },
            }),
            z.literal('gated', {
                errorMap: (_err, _ctx) => {
                    return { message: gatingTypeErrorMessage }
                },
            }),
        ]),
        tokensGatedBy: z.array(tokenSchema),
        usersGatedBy: z.array(z.string()),
    })
    .superRefine((data, ctx) => {
        if (data['gatingType'] === 'gated') {
            if (data['tokensGatedBy']?.length === 0 && data['usersGatedBy']?.length === 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['tokensGatedBy'],
                    message: 'Select at least one token or add a user',
                })
            }
        }
    })

export type GatingSchemaType = z.infer<typeof gatingSchema>
