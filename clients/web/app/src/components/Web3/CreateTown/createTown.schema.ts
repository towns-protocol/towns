import { ethers } from 'ethers'
import { z } from 'zod'
import { zodUnionFromArray } from 'utils/zodUnionFromArray'
import { membershipLimitSchema } from '@components/SpaceSettingsPanel/membershipSettingsSchema'
import { gatingSchema } from '../Gating/Gating.schema'

export const GATING_ENABLED = false

export const DEFAULT_MEMBERSHIP_LIMIT = 1000
export const MAX_LENGTH_SPACE_NAME = 32
export const MAX_LENGTH_SPACE_BIO = 240

export const clientTownTypeOptions = ['free', 'paid'] as const
export const clientMembershipFeeOptions = ['fixed', 'dynamic'] as const
export const clientCanJoinOptions = ['anyone', 'gated'] as const
export const clientGateByOptions = ['digitalAssets', 'walletAddress'] as const

const spaceName = z
    .string()
    .min(2, 'Town Name must have at least 2 characters')
    .max(MAX_LENGTH_SPACE_NAME, 'Town Name must be less than 32 characters')
    .refine((val) => !val.match(/^\s+|\s+$/), {
        message: 'Please remove any leading or trailing spaces',
    })
    .transform((val) => val.trim())

export const createTownFormSchema = z
    .object({
        clientTownType: zodUnionFromArray(clientTownTypeOptions).nullable(),
        clientCanJoin: zodUnionFromArray(clientCanJoinOptions).nullable(),
        clientGateBy: zodUnionFromArray(clientGateByOptions).nullable(),
        slideNameAndIcon: z.object({
            spaceName,
            spaceIconUrl: z.coerce.string().nullable(),
            spaceIconFile: z
                .custom<File>((val) => val instanceof File, 'Please upload an image')
                .nullable(),
        }),
        slideMembership: z.object({
            clientMembershipFee: zodUnionFromArray(clientMembershipFeeOptions).nullable(),
            membershipLimit: membershipLimitSchema,
            membershipCost: z.string().optional(),
        }),
    })
    .and(gatingSchema)

export const useRefinedCreateTownShema = ({
    minMembershipCost,
}: {
    minMembershipCost: string | undefined
}) => {
    return createTownFormSchema.superRefine((data, ctx) => {
        if (!data.slideNameAndIcon.spaceName) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['slideNameAndIcon', 'spaceName'],
                message: 'Please enter a town name.',
            })
        }
        if (data.slideNameAndIcon.spaceIconFile === null) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['slideNameAndIcon', 'spaceIconFile'],
                message: 'Please upload an image.',
            })
        }
        if (data.clientTownType === null) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['clientTownType'],
                message: 'Please choose a town type.',
            })
        }

        if (data.clientTownType === 'paid') {
            if (data.slideMembership.clientMembershipFee === null) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['slideMembership', 'clientMembershipFee'],
                    message: 'Please choose a membership fee type.',
                })
            }
            if (data.slideMembership.clientMembershipFee === 'fixed') {
                let priceInWei: ethers.BigNumberish
                try {
                    priceInWei = ethers.utils.parseEther(data.slideMembership.membershipCost ?? '')
                } catch (error) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ['slideMembership', 'membershipCost'],
                        message: 'Please enter a valid eth value.',
                    })
                    return
                }
                if (
                    minMembershipCost !== undefined &&
                    priceInWei.lt(ethers.utils.parseEther(minMembershipCost))
                ) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ['slideMembership', 'membershipCost'],
                        message: `Fixed price must be at least ${minMembershipCost} ETH`,
                    })
                    return
                }
            }
        }
        if (GATING_ENABLED && data.clientCanJoin === null) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['clientCanJoin'],
                message: 'Please choose if users can join.',
            })
        }

        if (data.clientCanJoin === 'gated') {
            if (data.clientGateBy === null) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['clientGateBy'],
                    message: 'Please choose how users can join.',
                })
            }
        }
    })
}
