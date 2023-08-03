// Type aliases for better readability
export type SubscriptionObject = object
export type UserId = string
// Urgency is a string enum that can only be one of the following values
// Sets the priority of the notification. Defaults to "normal".
const urgency = ['very-low', 'low', 'normal', 'high'] as const
export type Urgency = (typeof urgency)[number]

// only 'web-push' is supported for now. 'ios' and 'android' are reserved for
// future use.
const pushTypes = ['web-push', 'ios', 'android'] as const
export type PushType = (typeof pushTypes)[number]

export enum Mute {
  Muted = 'muted',
  Unmuted = 'unmuted',
  Default = 'default',
}

export enum NotificationType {
  Mention = 'mention',
  NewMessage = 'new_message',
  ReplyTo = 'reply_to',
}

export enum Membership {
  NotSet = '',
  Joined = 'joined',
  Left = 'left',
}

export function isPushType(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any,
): args is PushType {
  return pushTypes.includes(args)
}

export function isUrgency(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any,
): args is Urgency {
  return urgency.includes(args)
}

export function isSubscriptionObject(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any,
): args is SubscriptionObject {
  return typeof args === 'object'
}

export function isUserId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any,
): args is UserId {
  return typeof args === 'string' && args.length > 0
}

export type NotificationContent = object

export interface NotificationPayload {
  notificationType: NotificationType
  content: NotificationContent
}

export function isNotificationPayload(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any,
): args is NotificationPayload {
  return (
    typeof args === 'object' &&
    Object.values(NotificationType).includes(args.notificationType) &&
    typeof args.content === 'object'
  )
}

// relationship between town and channels
export interface UserSettingsSpace {
  spaceId: string
  spaceMembership: Membership
  spaceMute: Mute
}

export interface UserSettingsChannel {
  spaceId: string
  channelId: string
  channelMembership: Membership
  channelMute: Mute
}

export interface UserSettings {
  // metadata about the user and the towns
  userId: UserId
  spaceSettings: UserSettingsSpace[]
  channelSettings: UserSettingsChannel[]
}

export function isUserSettings(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any,
): args is UserSettings {
  return (
    typeof args === 'object' &&
    typeof args.userId === 'string' &&
    args.userId.length > 0 && // userId is required
    isUserSettingsSpaceArray(args.spaceSettings) &&
    isUserSettingsChannelArray(args.channelSettings)
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isUserSettingsSpace(args: any): args is UserSettingsSpace {
  return (
    typeof args === 'object' &&
    typeof args.spaceId === 'string' &&
    typeof args.spaceMembership === 'string' &&
    typeof args.spaceMute === 'string'
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isUserSettingsChannel(args: any): args is UserSettingsChannel {
  return (
    typeof args === 'object' &&
    typeof args.spaceId === 'string' &&
    typeof args.channelId === 'string' &&
    typeof args.channelMembership === 'string' &&
    typeof args.channelMute === 'string'
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isUserSettingsSpaceArray(args: any): args is UserSettingsSpace[] {
  return Array.isArray(args) && args.every((item) => isUserSettingsSpace(item))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isUserSettingsChannelArray(args: any): args is UserSettingsChannel[] {
  return (
    Array.isArray(args) && args.every((item) => isUserSettingsChannel(item))
  )
}

export interface PushOptions {
  userId: string // recipient
  channelId: string
  payload: NotificationPayload
  urgency?: Urgency
}
