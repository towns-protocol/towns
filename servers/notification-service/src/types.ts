import { z } from 'zod'
import {
    notificationContentDmSchema,
    notificationContentMessageSchema,
    notificationContentSchema,
    notificationPayloadSchema,
    notifyUsersSchema,
} from './application/schema/notificationSchema'
import {
    addSubscriptionSchema,
    removeSubscriptionSchema,
} from './application/schema/subscriptionSchema'
import {
    deleteUserSettingsSchema,
    getUserSettingsSchema,
    saveUserSettingsSchema,
} from './application/schema/notificationSettingsSchema'
import { tagMentionUsersSchema, tagReplyUserSchema } from './application/schema/tagSchema'

export { Mute } from './application/schema/notificationSettingsSchema'
export { NotificationKind } from './application/schema/tagSchema'
export { PushType } from './application/schema/subscriptionSchema'
export { Urgency } from './application/schema/notificationSchema'

export type AddSubscriptionSchema = z.infer<typeof addSubscriptionSchema>
export type DeleteUserSettingsSchema = z.infer<typeof deleteUserSettingsSchema>
export type GetUserSettingsSchema = z.infer<typeof getUserSettingsSchema>
export type NotificationContentDmSchema = z.infer<typeof notificationContentDmSchema>
export type NotificationContentMessageSchema = z.infer<typeof notificationContentMessageSchema>
export type NotificationContentSchema = z.infer<typeof notificationContentSchema>
export type NotificationPayloadSchema = z.infer<typeof notificationPayloadSchema>
export type NotifyUsersSchema = z.infer<typeof notifyUsersSchema>
export type RemoveSubscriptionSchema = z.infer<typeof removeSubscriptionSchema>
export type SaveUserSettingsSchema = z.infer<typeof saveUserSettingsSchema>
export type TagMentionUsersSchema = z.infer<typeof tagMentionUsersSchema>
export type TagReplyUserSchema = z.infer<typeof tagReplyUserSchema>
