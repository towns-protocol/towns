import { z } from 'zod'
import { gatingSchema } from '@components/Web3/Gating/Gating.schema'

export const MAX_LENGTH_SPACE_NAME = 32
export const MAX_LENGTH_SPACE_BIO = 240

const membershipPricingErrorMessage =
    'Please choose how you want to set the price of your membership.'

export const membershipLimitSchema = z.coerce
    .number({ message: 'Please enter a number' })
    .min(1, { message: 'Please enter a number greater than 0' })
    .max(2000, { message: 'Please enter a number less than or equal to 2000' })

export const membershipSettingsSchema = z
    .object({
        // membershipDuration: z.number(), TODO contract updates
        // membershipGasFeePayer: z.nativeEnum(MembershipGasFeePayer), TODO contract updates
        membershipCurrency: z.string(),
        membershipLimit: membershipLimitSchema,
        membershipPricingType: z.union([
            z.literal('dynamic', {
                errorMap: (_err, _ctx) => {
                    // invalid_literal is the error code, but zod only configs for invalid_type_error
                    return { message: membershipPricingErrorMessage }
                },
            }),
            z.literal('fixed', {
                errorMap: (_err, _ctx) => {
                    // invalid_literal is the error code, but zod only configs for invalid_type_error
                    return { message: membershipPricingErrorMessage }
                },
            }),
        ]),
        /**
         * this is just for the radio card selection whereas
         * "membershipPricingType" actually determines the pricing type
         */
        clientPricingOption: z.union([
            z.literal('dynamic', {
                errorMap: (_err, _ctx) => {
                    return { message: membershipPricingErrorMessage }
                },
            }),
            z.literal('fixed', {
                errorMap: (_err, _ctx) => {
                    return { message: membershipPricingErrorMessage }
                },
            }),
            z.literal('prepaid', {
                errorMap: (_err, _ctx) => {
                    return { message: membershipPricingErrorMessage }
                },
            }),
        ]),
        membershipCost: z.string(),
        prepaidMemberships: z
            .number({
                message: 'Please enter a number.',
            })
            .int({
                message: 'Please enter an integer.',
            })
            .optional()
            .default(0),
    })
    .and(gatingSchema)
    .superRefine((data, ctx) => {
        const membershipCostAsNumber = Number(data['membershipCost'])
        const membershipPricingType = data['membershipPricingType']
        const isFixedPricing = membershipPricingType === 'fixed'
        const isPrepaidPricingSelected = data['clientPricingOption'] === 'prepaid'

        if (isPrepaidPricingSelected) {
            const prepaidMemberships = data['prepaidMemberships']
            if (!Number.isInteger(prepaidMemberships) || prepaidMemberships < 1) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Please enter a valid number of additional prepaid memberships',
                    path: ['prepaidMemberships'],
                })
            }
        }

        // setting dynamic pricing sets the cost to 0
        // so we only need to perform checks if the pricing is fixed
        // cost is also checked during form submission after this validation has passed
        if (isFixedPricing) {
            if (isNaN(membershipCostAsNumber)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Please enter a valid number.',
                    path: ['membershipCost'],
                })
            }

            // const minimumMembershipCost = getPlatformMinMembershipPriceFromQueryCache()
            // const minCostInEth = minimumMembershipCost
            //     ? ethers.utils.formatEther(minimumMembershipCost)
            //     : undefined

            // if (minCostInEth !== undefined && membershipCostAsNumber < parseFloat(minCostInEth)) {
            //     ctx.addIssue({
            //         code: z.ZodIssueCode.custom,
            //         message: `The cost of a membership must be at least ${minCostInEth} ETH.`,
            //         path: ['membershipCost'],
            //     })
            // }
        }
    })

export type MembershipSettingsSchemaType = z.infer<typeof membershipSettingsSchema>
