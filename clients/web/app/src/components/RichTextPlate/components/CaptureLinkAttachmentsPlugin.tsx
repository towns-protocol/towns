import React, { useEffect } from 'react'
import { EmbeddedMessageAttachment, UnfurledLinkAttachment } from 'use-towns-client'
import { useEditorSelector } from '@udecode/plate-core'
import { useExtractMessageAttachments } from 'hooks/useExtractMessageAttachments'
import { useThrottledValue } from 'hooks/useThrottledValue'
import { SECOND_MS } from 'data/constants'
import {
    LoadingUnfurledLinkAttachment,
    useExtractExternalLinks,
} from 'hooks/useExtractInternalLinks'
import { toPlainText } from '../utils/toPlainText'

export const CaptureLinkAttachmentsPlugin = (props: {
    onUpdate: (
        messageAttachments: EmbeddedMessageAttachment[],
        unfurledLinkAttachments: (UnfurledLinkAttachment | LoadingUnfurledLinkAttachment)[],
        isLoading: boolean,
    ) => void
}) => {
    const { onUpdate } = props

    const text = useThrottledValue(
        useEditorSelector((editor) => toPlainText(editor.children), []),
        SECOND_MS * 0.5,
    )

    const { attachments: messageAttachments } = useExtractMessageAttachments(text)
    const { attachments: externalAttachments, isLoading } = useExtractExternalLinks(text)

    useEffect(() => {
        onUpdate(
            messageAttachments,
            externalAttachments
                // omit external urls already included as message attachments
                .filter((l) => messageAttachments.every((m) => m.url !== l.url)),
            isLoading,
        )
    }, [externalAttachments, isLoading, messageAttachments, onUpdate])

    return <></>
}
