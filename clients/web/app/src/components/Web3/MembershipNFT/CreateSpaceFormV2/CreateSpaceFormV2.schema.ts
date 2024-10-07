import { z } from 'zod'
import { getPlatformMinMembershipPriceFromQueryCache } from 'use-towns-client'
import { ethers } from 'ethers'
import { gatingSchema } from '@components/Web3/Gating/Gating.schema'

export const MAX_LENGTH_SPACE_NAME = 32
export const MAX_LENGTH_SPACE_BIO = 240

const membershipPricingErrorMessage =
    'Please choose how you want to set the price of your membership.'

export const membershipSettingsSchema = z
    .object({
        // membershipDuration: z.number(), TODO contract updates
        // membershipGasFeePayer: z.nativeEnum(MembershipGasFeePayer), TODO contract updates
        membershipCurrency: z.string(),
        membershipLimit: z.coerce
            .number({
                errorMap: (err, ctx) => {
                    return {
                        message: 'Please enter a number',
                    }
                },
            })
            .min(1, {
                message: 'Please enter a number greater than 0',
            }),
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
        prepaidMemberships: z.number().optional().default(0),
    })
    .and(gatingSchema)
    .superRefine((data, ctx) => {
        const membershipCostAsNumber = Number(data['membershipCost'])
        const membershipPricingType = data['membershipPricingType']
        const isFixedPricing = membershipPricingType === 'fixed'

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

            const minimumMembershipCost = getPlatformMinMembershipPriceFromQueryCache()
            const minCostInEth = minimumMembershipCost
                ? ethers.utils.formatEther(minimumMembershipCost)
                : undefined

            if (minCostInEth !== undefined && membershipCostAsNumber < parseFloat(minCostInEth)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `The cost of a membership must be at least ${minCostInEth} ETH.`,
                    path: ['membershipCost'],
                })
            }
        }
    })

export const schema = z
    .object({
        spaceIconUrl: z.coerce.string().optional().nullable(),
        spaceIconFile: z.custom<File>((val) => val instanceof File, 'Please upload an image'),
        spaceName: z
            .string({
                errorMap: (err, ctx) => {
                    if (ctx.data === null) {
                        return { message: 'Town name is required.' }
                    }

                    if (ctx.data?.length === 0 || err.code === 'too_small') {
                        return { message: 'Town name must be at least 2 characters.' }
                    }
                    if (err.code === 'too_big') {
                        return { message: 'Town name must be less than 32 characters.' }
                    }

                    return {
                        message: 'Town name must be between 2 and 32 characters.',
                    }
                },
            })
            .min(2)
            .max(MAX_LENGTH_SPACE_NAME),
        // spaceOwner: z.string(), TODO contract updates
        shortDescription: z.string().optional().nullable(),
        longDescription: z.string().optional().nullable(),
    })
    .and(membershipSettingsSchema)

export type CreateSpaceFormV2SchemaType = z.infer<typeof schema>
export type MembershipSettingsSchemaType = z.infer<typeof membershipSettingsSchema>
