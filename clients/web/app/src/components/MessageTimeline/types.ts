import {
    EncryptedMessageRenderEvent,
    FullyReadRenderEvent,
    MessageRenderEvent,
    RedactedMessageRenderEvent,
    RenderEvent,
    ThreadUpdateRenderEvent,
    UserMessagesRenderEvent,
} from './util/getEventsByDate'

export type ListItem =
    | { key: string; type: 'divider' }
    | { key: string; type: 'expander' }
    | { key: string; type: 'header' }
    | { key: string; type: 'group'; date: string; isNew?: boolean }
    | { key: string; type: 'user-messages'; item: UserMessagesRenderEvent }
    | { key: string; type: 'fully-read'; item: FullyReadRenderEvent }
    | {
          key: string
          type: 'message'
          item: MessageRenderEvent | EncryptedMessageRenderEvent | RedactedMessageRenderEvent
      }
    | { key: string; type: 'thread-update'; item: ThreadUpdateRenderEvent }
    | {
          key: string
          type: 'generic'
          item: RenderEvent
      }
