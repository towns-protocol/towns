import { useContext } from 'react'
import { EmbeddedAttachmentsContext } from '../MessageAttachmentsContext'

export const useIsMessageAttachementContext = () => {
    return {
        isMessageAttachementContext: useContext(EmbeddedAttachmentsContext)
            ?.isMessageAttachementContext,
    }
}
