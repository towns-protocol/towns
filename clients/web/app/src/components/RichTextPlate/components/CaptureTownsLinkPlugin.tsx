import React, { useEffect } from 'react'
import { EmbeddedMessageAttachment } from 'use-towns-client'
import { useEditorSelector } from '@udecode/plate-core'
import { useExtractMessageAttachments } from 'hooks/useExtractMessageAttachments'
import { useThrottledValue } from 'hooks/useThrottledValue'
import { SECOND_MS } from 'data/constants'
import { toPlainText } from '../utils/toPlainText'

export const CaptureTownsLinkPlugin = (props: {
    onUpdate: (links: EmbeddedMessageAttachment[]) => void
}) => {
    const { onUpdate } = props
    const children = useThrottledValue(
        useEditorSelector((editor) => toPlainText(editor.children), []),
        SECOND_MS,
    )

    const { attachments } = useExtractMessageAttachments({ text: children })

    useEffect(() => {
        onUpdate(attachments)
    }, [attachments, onUpdate])

    return <></>
}
