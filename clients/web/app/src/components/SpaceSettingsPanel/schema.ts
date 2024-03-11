import { Permission } from 'use-towns-client'
import { z } from 'zod'
import { tokenEntitlementSchema } from '@components/Tokens/TokenSelector/tokenSchemas'

export const formSchema = z
    .object({
        name: z
            .string({
                errorMap: (err, ctx) => {
                    if (ctx.data == undefined || ctx.data === '') {
                        return { message: 'Role name is required.' }
                    }
                    return {
                        message: 'Role name is required.',
                    }
                },
            })
            .min(1),
        tokens: z.array(tokenEntitlementSchema),
        permissions: z.array(z.nativeEnum(Permission)),
        users: z.array(z.string()),
    })
    // check that at least a token or user is selected
    // this custom check does not run on hookForm "onChange" mode (or else I'm doing it wrong)
    // so within the form, hookForm.trigger('tokens') is called to trigger the check
    .superRefine((data, ctx) => {
        if (data['tokens'].length === 0 && data['users'].length === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['tokens'],
                message: 'Select at least one token or user',
            })
        }
    })
