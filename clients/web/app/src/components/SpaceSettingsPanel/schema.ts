import { Permission } from 'use-towns-client'
import { z } from 'zod'
import { gatingSchema } from '@components/Web3/Gating/Gating.schema'

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
        channelPermissions: z.array(z.nativeEnum(Permission)),
        townPermissions: z.array(z.nativeEnum(Permission)),
    })
    .and(gatingSchema)
