// only 'web-push' is supported for now. 'ios' and 'android' are reserved for future use.
export type PushType = 'web-push' | 'ios' | 'android'

export interface PushSubscriptionKeys {
  auth: string
  p256dh: string
}

export interface PushSubscription {
  endpoint: string
  keys: PushSubscriptionKeys
}

export interface AddSubscriptionRequestParams {
  spaceId: string
  channelId?: string
  userId: string
  pushSubscription: PushSubscription
  pushType?: PushType
}

export function isAddSubscriptionRequestParams(
  params: any,
): params is AddSubscriptionRequestParams {
  return params.spaceId && params.userId && params.pushSubscription
}
