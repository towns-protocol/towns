import { z } from 'zod'
import { tokenEntitlementSchema } from '@components/Tokens/TokenSelector/tokenSchemas'

// enum MembershipGasFeePayer {
//     Member = 'member',
//     Town = 'town',
// }

export const MAX_LENGTH_SPACE_NAME = 32
export const MAX_LENGTH_SPACE_BIO = 240

const membershipTypeErrorMessage = 'Please choose who can join your town.'
export const membershipCostError = `Only towns with a fixed cost of more than 1 ETH can set a limit of more than 1000. Read more about River's ecosystem here`

export const membershipSettingsSchema = z
    .object({
        // membershipDuration: z.number(), TODO contract updates
        // membershipGasFeePayer: z.nativeEnum(MembershipGasFeePayer), TODO contract updates
        membershipCurrency: z.string(),
        membershipLimit: z.coerce.number({
            errorMap: (err, ctx) => {
                if (err.code === 'invalid_type') {
                    return { message: 'Please enter a number.' }
                }
                return {
                    message: 'Please enter a number.',
                }
            },
        }),
        membershipPricingType: z.union([
            z.literal('dynamic', {
                errorMap: (_err, _ctx) => {
                    // invalid_literal is the error code, but zod only configs for invalid_type_error
                    return { message: membershipTypeErrorMessage }
                },
            }),
            z.literal('fixed', {
                errorMap: (_err, _ctx) => {
                    // invalid_literal is the error code, but zod only configs for invalid_type_error
                    return { message: membershipTypeErrorMessage }
                },
            }),
        ]),
        membershipCost: z.string(),
        membershipType: z.union([
            z.literal('everyone', {
                errorMap: (_err, _ctx) => {
                    // invalid_literal is the error code, but zod only configs for invalid_type_error
                    return { message: membershipTypeErrorMessage }
                },
            }),
            z.literal('tokenHolders', {
                errorMap: (_err, _ctx) => {
                    // invalid_literal is the error code, but zod only configs for invalid_type_error
                    return { message: membershipTypeErrorMessage }
                },
            }),
        ]),
        tokensGatingMembership: z.array(tokenEntitlementSchema),
    })
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

            if (membershipCostAsNumber < 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Please enter a positive number.',
                    path: ['membershipCost'],
                })
            }
        }

        if (data['membershipLimit'] > 1000 && membershipCostAsNumber < 1) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: membershipCostError,
                path: ['membershipCost'],
            })
        }

        if (data['membershipType'] === 'tokenHolders') {
            if (data['tokensGatingMembership']?.length === 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['tokensGatingMembership'],
                    message: 'Select at least one token',
                })
            }
        }
    })

export const schema = z
    .object({
        spaceIconUrl: z.coerce.string().optional().nullable(),
        spaceIconFile: z
            .custom<File>((val) => val instanceof File, 'Please upload a file')
            .optional()
            .nullable(),
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
        spaceMotto: z.string().optional().nullable(),
        spaceBio: z.string().optional().nullable(),
    })
    .and(membershipSettingsSchema)

export type CreateSpaceFormV2SchemaType = z.infer<typeof schema>
export type MembershipSettingsSchemaType = z.infer<typeof membershipSettingsSchema>
