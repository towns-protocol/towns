import React, { useState } from 'react'
import linkifyit from 'linkify-it'
import { useEvent } from 'react-use-event-hook'
import { focusEditor } from '@udecode/slate-react'
import { useEditorRef } from '@udecode/plate-common'
import { getEditorString } from '@udecode/slate'
import { upsertLink } from '@udecode/plate-link'
import { useDevice } from 'hooks/useDevice'
import { AddLinkModal } from './LinkModal'
import { FloatingToolbar } from './FloatingToolbar'
import { FormattingToolbar, FormattingToolbarProps } from './FormattingToolbar'

interface Props extends Omit<FormattingToolbarProps, 'onLinkClick'> {
    editorId: string
}
const linkify = linkifyit()

export const ToolbarController = ({ editorId, ...props }: Props) => {
    const [linkLinkModal, setLinkModal] = useState(false)
    const editor = useEditorRef()

    const onLinkClick = useEvent(() => {
        if (isTouch) {
            const text = prompt('Add Link', 'https://')
            focusEditor(editor)
            if (!text) {
                return
            }
            if (text.length < 1) {
                return
            }
            onSaveLink(text || '')
        } else {
            setLinkModal(true)
        }
    })

    const onSaveLink = useEvent((text: string) => {
        const parsedLink = linkify.match(text)?.[0]
        if (!parsedLink) {
            return
        }

        // If user has selected a text, we do not want to override it with the
        // user's inputted link which may not be correctly formatted and let
        // PlateJS handle it internally but adding an HREF over initially selected text
        const selectionText = getEditorString(editor, editor.selection)
        const linkText = selectionText ? undefined : parsedLink.text

        upsertLink(editor, { url: parsedLink.url, text: linkText })
    })

    const onHideModal = useEvent(() => {
        setLinkModal(false)
    })

    const { isTouch } = useDevice()
    return (
        <>
            <FormattingToolbar {...props} onLinkClick={onLinkClick} />
            {!isTouch && (
                <FloatingToolbar editorId={editorId} disabled={props.showFormattingToolbar}>
                    <FormattingToolbar
                        {...props}
                        showFormattingToolbar
                        isFloating
                        onLinkClick={onLinkClick}
                    />
                </FloatingToolbar>
            )}
            {linkLinkModal && <AddLinkModal onHide={onHideModal} onSaveLink={onSaveLink} />}
        </>
    )
}
