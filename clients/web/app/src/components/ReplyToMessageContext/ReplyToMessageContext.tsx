import { createContext } from 'react'

export const ReplyToMessageContext = createContext<{
    canReplyInline: boolean
    setReplyToEventId?: (threadId: string | null) => void
    replyToEventId?: string | null
}>({ canReplyInline: false })
