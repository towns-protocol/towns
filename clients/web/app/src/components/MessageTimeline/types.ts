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
    | { id: string; type: 'divider' }
    | { id: string; type: 'expander' }
    | { id: string; type: 'header' }
    | { id: string; type: 'group'; date: string; isNew?: boolean }
    | { id: string; type: 'user-messages'; item: UserMessagesRenderEvent }
    | { id: string; type: 'fully-read'; item: FullyReadRenderEvent }
    | {
          id: string
          type: 'message'
          item: MessageRenderEvent | EncryptedMessageRenderEvent | RedactedMessageRenderEvent
      }
    | { id: string; type: 'thread-update'; item: ThreadUpdateRenderEvent }
    | {
          id: string
          type: 'generic'
          item: RenderEvent
      }
