import { z } from 'zod'
import {
    notificationContentDmSchema,
    notificationContentMessageSchema,
    notificationContentSchema,
    notificationPayloadSchema,
    notifyUsersSchema,
} from './application/notificationSchema'
import { addSubscriptionSchema, removeSubscriptionSchema } from './application/subscriptionSchema'
import {
    deleteUserSettingsSchema,
    getUserSettingsSchema,
    saveUserSettingsSchema,
    patchUserSettingsSchema,
} from './application/notificationSettingsSchema'
import { tagMentionUsersSchema, tagReplyUserSchema } from './application/tagSchema'

export { Mute } from './application/notificationSettingsSchema'
export { NotificationKind, NotificationAttachmentKind } from './application/tagSchema'
export { PushType } from './application/subscriptionSchema'
export { Urgency } from './application/notificationSchema'

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
export type PatchUserSettingsSchema = z.infer<typeof patchUserSettingsSchema>
export type TagMentionUsersSchema = z.infer<typeof tagMentionUsersSchema>
export type TagReplyUserSchema = z.infer<typeof tagReplyUserSchema>
