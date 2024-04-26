import { z } from 'zod'
import { membershipSettingsSchema } from '@components/Web3/MembershipNFT/CreateSpaceFormV2/CreateSpaceFormV2.schema'

// TODO: separate prepay into its own form
export const editMembershipSchema = z
    .object({
        prepaidMemberships: z.coerce
            .number({
                errorMap: (err, ctx) => {
                    return {
                        message: 'Please enter a number.',
                    }
                },
            })
            .min(0),
    })
    .and(membershipSettingsSchema)
    .superRefine((data, ctx) => {
        if (data['prepaidMemberships'] > data['membershipLimit']) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Prepaid memberships cannot exceed the membership limit.',
                path: ['prepaidMemberships'],
            })
        }
    })

export type EditMembershipSchemaType = z.infer<typeof editMembershipSchema>
