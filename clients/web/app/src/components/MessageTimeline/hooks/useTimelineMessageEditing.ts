import { useCallback, useState } from 'react'

export const useTimelineMessageEditing = () => {
    const [editingMessageId, setEditingMessageId] = useState<string>()

    const onSelectEditingMessage = useCallback(
        (messageId: string) => {
            setEditingMessageId(() => (editingMessageId === messageId ? undefined : messageId))
        },
        [editingMessageId],
    )

    const onCancelEditingMessage = useCallback(() => {
        setEditingMessageId(undefined)
    }, [])

    return {
        editingMessageId,
        onSelectEditingMessage,
        onCancelEditingMessage,
    }
}
