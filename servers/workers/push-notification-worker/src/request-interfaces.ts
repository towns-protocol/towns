import {
  NotificationPayload,
  UserSettings,
  PushType,
  SubscriptionObject,
  Urgency,
  UserId,
  isNotificationPayload,
  isPushType,
  isSubscriptionObject,
  isUrgency,
  isUserId,
  isUserSettings,
} from './types'

export interface AddSubscriptionRequestParams {
  userId: UserId
  subscriptionObject: SubscriptionObject
  pushType?: PushType
}

export function isAddSubscriptionRequestParams(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any,
): params is AddSubscriptionRequestParams {
  return isUserId(params.userId) &&
    isSubscriptionObject(params.subscriptionObject) &&
    params.pushType /*optional parameter*/
    ? isPushType(params.pushType)
    : true
}

export interface RemoveSubscriptionRequestParams {
  userId: string
  subscriptionObject: SubscriptionObject
}

export function isRemoveSubscriptionRequestParams(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any,
): params is RemoveSubscriptionRequestParams {
  return (
    isUserId(params.userId) && isSubscriptionObject(params.subscriptionObject)
  )
}

export interface NotifyRequestParams {
  sender: string
  users: string[]
  payload: NotificationPayload
  spaceId: string
  channelId: string // channelId
  /* push options */
  urgency?: Urgency
}

export function isNotifyRequestParams(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any,
): params is NotifyRequestParams {
  return (
    typeof params.spaceId === 'string' &&
    typeof params.channelId === 'string' &&
    typeof params.sender === 'string' &&
    Array.isArray(params.users) &&
    params.users?.length > 0 &&
    params.users.every((user: unknown) => isUserId(user)) &&
    isNotificationPayload(params.payload) &&
    /* optional parameters */
    (isUrgency(params.urgency) || params.urgency === undefined)
  )
}

export interface MentionRequestParams {
  spaceId: string
  channelId: string
  userIds: string[]
}

export function isMentionRequestParams(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any,
): params is MentionRequestParams {
  return (
    typeof params.spaceId === 'string' &&
    typeof params.channelId === 'string' &&
    params.channelId.length > 0 && // channelId is required
    Array.isArray(params.userIds) &&
    params.userIds.every((user: unknown) => isUserId(user))
  )
}

export interface ReplyToRequestParams {
  spaceId: string
  channelId: string
  userIds: string[]
}

export function isReplyToRequestParams(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any,
): params is ReplyToRequestParams {
  return (
    typeof params.spaceId === 'string' &&
    typeof params.channelId === 'string' &&
    params.channelId.length > 0 && // channelId is required
    Array.isArray(params.userIds) &&
    params.userIds.every((user: unknown) => isUserId(user))
  )
}

export interface SaveSettingsRequestParams {
  userSettings: UserSettings
}

export function isSaveSettingsRequestParams(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any,
): params is SaveSettingsRequestParams {
  return (
    typeof params.userSettings === 'object' &&
    isUserSettings(params.userSettings)
  )
}

export interface DeleteSettingsRequestParams {
  userId: string
}

export function isDeleteSettingsRequestParams(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any,
): params is DeleteSettingsRequestParams {
  return (
    typeof params.userId === 'string' && params.userId.length > 0 // userId is required
  )
}

export interface GetSettingsRequestParams {
  userId: string
}

export function isGetSettingsRequestParams(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any,
): params is DeleteSettingsRequestParams {
  return (
    typeof params.userId === 'string' && params.userId.length > 0 // userId is required
  )
}
