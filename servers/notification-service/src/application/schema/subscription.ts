import { z } from 'zod'

export enum PushType {
    WebPush = 'web-push',
    iOS = 'ios',
    Android = 'android',
}

export const subscriptionSchema = z.object({
    userId: z.string(),
    // TODO: fix this any when I know what it should look like
    subscriptionObject: z.object({
        endpoint: z.string(),
        expirationTime: z.number().nullable(),
        keys: z.object({
            p256dh: z.string(),
            auth: z.string(),
        }),
    }),
    pushType: z.nativeEnum(PushType).optional(),
})
