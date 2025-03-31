import { createContext } from 'react'

export const EmbeddedAttachmentsContext = createContext({
    isMessageAttachementContext: false,
})

export const MessageAttachmentPresentationContext = createContext<{
    // when there's more than 1 attachment and the conditions are met,
    // the items need to adapt to fit in height
    isGridContext: boolean
    gridRowHeight: number | undefined
}>({
    isGridContext: false,
    gridRowHeight: undefined,
})
