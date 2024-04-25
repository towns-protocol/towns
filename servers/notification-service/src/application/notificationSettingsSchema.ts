import { z } from 'zod'

export enum Mute {
    Muted = 'muted',
    Unmuted = 'unmuted',
    Default = 'default',
}

export const saveUserSettingsSchema = z.object({
    userSettings: z.object({
        userId: z.string().min(1),
        spaceSettings: z.array(
            z.object({
                spaceId: z.string().min(1),
                spaceMute: z.nativeEnum(Mute),
            }),
        ),
        channelSettings: z.array(
            z.object({
                spaceId: z.string(),
                channelId: z.string().min(1),
                channelMute: z.nativeEnum(Mute),
            }),
        ),
        replyTo: z.boolean(),
        mention: z.boolean(),
        directMessage: z.boolean(),
    }),
})

export const patchUserSettingsSchema = z.object({
    userSettings: z.object({
        userId: z.string().min(1),
        spaceSettings: z
            .array(
                z.object({
                    spaceId: z.string().min(1),
                    spaceMute: z.nativeEnum(Mute),
                }),
            )
            .optional(),
        channelSettings: z
            .array(
                z.object({
                    spaceId: z.string(),
                    channelId: z.string().min(1),
                    channelMute: z.nativeEnum(Mute),
                }),
            )
            .optional(),
        replyTo: z.boolean().optional(),
        mention: z.boolean().optional(),
        directMessage: z.boolean().optional(),
    }),
})

export const deleteUserSettingsSchema = z.object({
    userId: z.string().min(1),
})

export const getUserSettingsSchema = z.object({
    userId: z.string().min(1),
})
