import {
    EncryptedMessageRenderEvent,
    MessageRenderEvent,
    MissingMessageRenderEvent,
    NewDividerRenderEvent,
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
    | { key: string; type: 'new-divider'; item: NewDividerRenderEvent }
    | {
          key: string
          type: 'message'
          item:
              | MessageRenderEvent
              | EncryptedMessageRenderEvent
              | RedactedMessageRenderEvent
              | MissingMessageRenderEvent
      }
    | { key: string; type: 'thread-update'; item: ThreadUpdateRenderEvent }
    | {
          key: string
          type: 'generic'
          item: RenderEvent
      }
