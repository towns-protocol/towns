import { z } from 'zod'
import { Mute } from '@prisma/client'

export const saveUserSettingsSchema = z.object({
    userId: z.string().min(1),
    spaceSettings: z.array(
        z.object({
            spaceId: z.string().min(1),
            spaceMute: z.nativeEnum(Mute),
        }),
    ),
    channelSettings: z.array(
        z.object({
            spaceId: z.string().min(1),
            channelId: z.string().min(1),
            channelMute: z.nativeEnum(Mute),
        }),
    ),
    replyTo: z.boolean(),
    mention: z.boolean(),
    directMessage: z.boolean(),
})

export const deleteUserSettingsSchema = z.object({
    userId: z.string().min(1),
})

export const getUserSettingsSchema = z.object({
    userId: z.string().min(1),
})
