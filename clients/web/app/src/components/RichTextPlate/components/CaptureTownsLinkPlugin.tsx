import React, { useEffect } from 'react'
import { EmbeddedMessageAttachment } from 'use-zion-client'
import { useEditorSelector } from '@udecode/plate-core'
import { useExtractMessageAttachments } from 'hooks/useExtractMessageAttachments'
import { toPlainText } from '../utils/toPlainText'

export const CaptureTownsLinkPlugin = (props: {
    onUpdate: (links: EmbeddedMessageAttachment[]) => void
}) => {
    const { onUpdate } = props
    const children = useEditorSelector((editor) => toPlainText(editor.children), [])

    useEffect(() => {
        console.log('children', children)
    }, [children])

    const { attachments } = useExtractMessageAttachments({ text: children })

    useEffect(() => {
        onUpdate(attachments)
    }, [attachments, onUpdate])

    return <></>
}
