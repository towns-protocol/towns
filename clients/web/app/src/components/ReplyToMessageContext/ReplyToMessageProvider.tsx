import React, { ContextType, useCallback, useMemo, useState } from 'react'
import { ReplyToMessageContext } from './ReplyToMessageContext'

export const ReplyContextProvider = (props: {
    children: React.ReactNode
    canReplyInline: boolean
}) => {
    const { children, canReplyInline } = props
    const [replyToEventId, setReplyToThreadId] = useState<string | null>(null)
    const setReplyToEventId = useCallback((threadId: string | null) => {
        setReplyToThreadId(threadId)
    }, [])

    const value = useMemo<ContextType<typeof ReplyToMessageContext>>(
        () => ({
            canReplyInline,
            setReplyToEventId,
            replyToEventId,
        }),
        [canReplyInline, setReplyToEventId, replyToEventId],
    )

    return <ReplyToMessageContext.Provider value={value}>{children}</ReplyToMessageContext.Provider>
}
