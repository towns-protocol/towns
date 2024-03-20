import { z } from 'zod'

export enum pushType {
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
    pushType: z.nativeEnum(pushType).optional(),
})

export const removeSubscriptionSchema = z.object({
    userId: z.string(),
    subscriptionObject: subscriptionObjectSchema,
})
