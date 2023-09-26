import { z } from 'zod'
import { EVERYONE, TOKEN_HOLDERS } from '@components/Web3/CreateSpaceForm/constants'

enum MembershipGasFeePayer {
    Member = 'member',
    Town = 'town',
}

export const MAX_LENGTH_SPACE_NAME = 32
export const MAX_LENGTH_SPACE_BIO = 240

const membershipTypeErrorMessage = 'Please choose who can join your town.'

export const schema = z.object({
    spaceIconUrl: z.string().optional(),
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
    spaceOwner: z.string(),
    spaceBio: z
        .string({
            errorMap: (err, ctx) => {
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
        .max(MAX_LENGTH_SPACE_BIO)
        .optional(),
    tokensGatingSpace: z.array(z.string()),
    membershipLimit: z.number(),
    membershipCost: z.number().default(1000),
    membershipDuration: z.number(),
    membershipGasFeePayer: z.nativeEnum(MembershipGasFeePayer),
    membershipType: z
        .union([
            z.literal(EVERYONE, {
                errorMap: (_err, _ctx) => {
                    // invalid_literal is the error code, but zod only configs for invalid_type_error
                    return { message: membershipTypeErrorMessage }
                },
            }),
            z.literal(TOKEN_HOLDERS, {
                errorMap: (_err, _ctx) => {
                    // invalid_literal is the error code, but zod only configs for invalid_type_error
                    return { message: membershipTypeErrorMessage }
                },
            }),
        ])
        .default(EVERYONE),
    tokens: z.array(
        z.object({
            contractAddress: z.string(),
            tokenIds: z.array(z.number()),
        }),
    ),
})

export type CreateSpaceFormV2SchemaType = z.infer<typeof schema>
