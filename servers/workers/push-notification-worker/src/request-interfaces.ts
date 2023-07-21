import {
  NotificationPayload,
  NotificationSettings,
  PushType,
  SubscriptionObject,
  Urgency,
  UserId,
  isNotificationPayload,
  isPushType,
  isSubscriptionObject,
  isUrgency,
  isUserId,
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
  topic: string // channelId
  /* push options */
  urgency?: Urgency
}

export function isNotifyRequestParams(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any,
): params is NotifyRequestParams {
  return (
    typeof params.topic === 'string' &&
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
  channelId: string
  userIds: string[]
}

export function isMentionRequestParams(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any,
): params is MentionRequestParams {
  return (
    typeof params.channelId === 'string' &&
    params.channelId.length > 0 && // channelId is required
    Array.isArray(params.userIds) &&
    params.userIds.every((user: unknown) => isUserId(user))
  )
}

export interface ReplyToRequestParams {
  channelId: string
  userIds: string[]
}

export function isReplyToRequestParams(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any,
): params is ReplyToRequestParams {
  return (
    typeof params.channelId === 'string' &&
    params.channelId.length > 0 && // channelId is required
    Array.isArray(params.userIds) &&
    params.userIds.every((user: unknown) => isUserId(user))
  )
}

export interface SaveSettingsRequestParams {
  userId: string
  settings: NotificationSettings
}

export function isSaveSettingsRequestParams(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any,
): params is SaveSettingsRequestParams {
  return (
    typeof params.userId === 'string' &&
    params.userId.length > 0 && // userId is required
    typeof params.settings === 'object'
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
