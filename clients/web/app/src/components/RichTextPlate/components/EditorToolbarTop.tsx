import React, { useState } from 'react'
import linkifyit from 'linkify-it'
import { useEvent } from 'react-use-event-hook'
import { useEditorRef } from '@udecode/plate-common'
import { getEditorString } from '@udecode/slate'
import { upsertLink } from '@udecode/plate-link'
import { useDevice } from 'hooks/useDevice'
import { AddLinkModal } from './plate-ui/LinkModal'
import { FloatingToolbar } from './plate-ui/FloatingToolbar'
import { FormattingToolbar, FormattingToolbarProps } from './plate-ui/FormattingToolbar'
import { focusEditorTowns, getLinkURLAtSelection } from '../utils/helpers'

interface Props extends Omit<FormattingToolbarProps, 'onLinkClick'> {
    editorId: string
}
const linkify = linkifyit()

export const EditorToolbarTop = ({ editorId, ...props }: Props) => {
    const [linkLinkModal, setLinkModal] = useState(false)
    const [existingLink, setExistingLink] = useState<string | undefined>(undefined)

    const editor = useEditorRef()

    const onLinkClick = useEvent(() => {
        // Check if the user is adding a new link or modifying an existing one
        const link = getLinkURLAtSelection(editor)

        if (isTouch) {
            const text = prompt(link ? 'Edit Link' : 'Add Link', link || 'https://')
            focusEditorTowns(editor)
            if (!text) {
                return
            }
            if (text.length < 1) {
                return
            }
            onSaveLink(text || '')
        } else {
            setExistingLink(link)
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
        focusEditorTowns(editor)
    })

    const onHideModal = useEvent(() => {
        setLinkModal(false)
        focusEditorTowns(editor)
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
            {linkLinkModal && (
                <AddLinkModal
                    existingLink={existingLink}
                    onHide={onHideModal}
                    onSaveLink={onSaveLink}
                />
            )}
        </>
    )
}
