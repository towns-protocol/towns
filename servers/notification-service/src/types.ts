import { z } from 'zod'
import {
    notificationContentDmSchema,
    notificationContentMessageSchema,
    notificationContentSchema,
    notificationPayloadSchema,
    notifyUsersSchema,
} from './application/schema/notificationSchema'
import { urgency } from './application/schema/notificationSchema'
import { notificationKind } from './application/schema/tagSchema'
import {
    addSubscriptionSchema,
    pushType,
    removeSubscriptionSchema,
} from './application/schema/subscriptionSchema'
import {
    deleteUserSettingsSchema,
    getUserSettingsSchema,
    saveUserSettingsSchema,
} from './application/schema/notificationSettingsSchema'

export { Mute } from '@prisma/client'
export type { UserSettings, UserSettingsChannel, UserSettingsSpace } from '@prisma/client'

export type AddSubscriptionSchema = z.infer<typeof addSubscriptionSchema>
export type DeleteUserSettingsSchema = z.infer<typeof deleteUserSettingsSchema>
export type GetUserSettingsSchema = z.infer<typeof getUserSettingsSchema>
export type NotificationContentDmSchema = z.infer<typeof notificationContentDmSchema>
export type NotificationContentMessageSchema = z.infer<typeof notificationContentMessageSchema>
export type NotificationContentSchema = z.infer<typeof notificationContentSchema>
export type NotificationPayloadSchema = z.infer<typeof notificationPayloadSchema>
export { notificationKind as NotificationKind }
export type NotifyUsersSchema = z.infer<typeof notifyUsersSchema>
export { pushType as PushType }
export type RemoveSubscriptionSchema = z.infer<typeof removeSubscriptionSchema>
export type SaveUserSettingsSchema = z.infer<typeof saveUserSettingsSchema>
export { urgency as Urgency }
