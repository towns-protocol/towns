export enum SendPushStatus {
  Success = 'success',
  Error = 'error',
  NotSubscribed = 'not-subscribed',
}

export interface SendPushResponse {
  status: SendPushStatus
  userId: string
  pushSubscription: string
  message?: string
}
