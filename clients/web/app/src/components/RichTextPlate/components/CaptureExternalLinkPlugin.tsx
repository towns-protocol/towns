import { useEditorSelector } from '@udecode/plate-common'
import React, { useEffect } from 'react'
import { UnfurledLinkAttachment } from 'use-towns-client'
import { useExtractExternalLinkAttachments } from 'hooks/useExtractMessageAttachments'
import { toPlainText } from '../utils/toPlainText'

export const CaptureExternalLinkPlugin = (props: {
    onUpdate: (links: UnfurledLinkAttachment[]) => void
}) => {
    const { onUpdate } = props

    const text = useEditorSelector((editor) => toPlainText(editor.children), [])
    const { attachments } = useExtractExternalLinkAttachments({ text: text })

    useEffect(() => {
        onUpdate(attachments)
    }, [attachments, onUpdate])

    return <></>
}
