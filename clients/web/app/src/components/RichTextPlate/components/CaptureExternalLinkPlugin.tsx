import React, { useEffect } from 'react'
import { UnfurledLinkAttachment } from 'use-towns-client'
import { useEditorSelector } from '@udecode/plate-common'
import { useThrottledValue } from 'hooks/useThrottledValue'
import { SECOND_MS } from 'data/constants'
import { useExtractExternalLinkAttachments } from 'hooks/useExtractMessageAttachments'
import { toPlainText } from '../utils/toPlainText'

export const CaptureExternalLinkPlugin = (props: {
    onUpdate: (links: UnfurledLinkAttachment[]) => void
}) => {
    const { onUpdate } = props
    const children = useThrottledValue(
        useEditorSelector((editor) => toPlainText(editor.children), []),
        SECOND_MS,
    )
    const { attachments } = useExtractExternalLinkAttachments({ text: children })

    useEffect(() => {
        onUpdate(attachments)
    }, [attachments, onUpdate])

    return <></>
}
