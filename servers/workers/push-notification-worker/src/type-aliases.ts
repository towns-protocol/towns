// Type aliases for better readability
export type SubscriptionObject = object
export type UserId = string
const urgency = ['very-low', 'low', 'normal', 'high'] as const
export type Urgency = (typeof urgency)[number]

// only 'web-push' is supported for now. 'ios' and 'android' are reserved for future use.
const pushTypes = ['web-push', 'ios', 'android'] as const
export type PushType = (typeof pushTypes)[number]

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
  return typeof args === 'string'
}
