import { z } from 'zod'

export enum PushType {
    WebPush = 'web-push',
    iOS = 'ios',
    Android = 'android',
}

const subscriptionObjectSchema = z.object({
    endpoint: z.string(),
    expirationTime: z.number().optional().nullable(),
    keys: z.object({
        p256dh: z.string(),
        auth: z.string(),
    }),
})

export const addSubscriptionSchema = z.object({
    userId: z.string(),
    subscriptionObject: subscriptionObjectSchema,
    pushType: z.nativeEnum(PushType).optional(),
})

export const removeSubscriptionSchema = z.object({
    userId: z.string(),
    subscriptionObject: subscriptionObjectSchema,
})
