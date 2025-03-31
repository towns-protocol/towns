import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

export const MessageEditContext = createContext<{
    removeAttachmentId?: (id: string) => void
    removedAttachmentIds: string[]
}>({
    removedAttachmentIds: [],
})

export const MessageEditContextProvider = (props: { children: React.ReactNode }) => {
    const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([])
    const removeAttachmentId = useCallback((id: string) => {
        setRemovedAttachmentIds((prev) => [...prev, id])
    }, [])

    const value = useMemo(
        () => ({
            removeAttachmentId,
            removedAttachmentIds,
        }),
        [removeAttachmentId, removedAttachmentIds],
    )

    return <MessageEditContext.Provider value={value}>{props.children}</MessageEditContext.Provider>
}

export const useMessageEditContext = () => {
    return useContext(MessageEditContext)
}
