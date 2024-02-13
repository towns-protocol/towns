import { useContext } from 'react'
import { MessageAttachmentsContext } from './MessageAttachmentsContext'

export const useIsMessageAttachementContext = () => {
    return {
        isMessageAttachementContext:
            useContext(MessageAttachmentsContext)?.isMessageAttachementContext,
    }
}
