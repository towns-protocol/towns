import React, { useCallback, useEffect, useRef, useState } from 'react'
import { PlateEditor, Value, findNode, isHotkey } from '@udecode/plate-common'
import { ELEMENT_LINK } from '@udecode/plate-link'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { Button, Stack, Text, TextField } from '@ui'

export const AddLinkModal = ({
    editor,
    onSaveLink,
    onHide,
}: {
    editor: PlateEditor<Value>
    onHide: () => void
    onSaveLink: (link: string) => void
}) => {
    const [existingLink, setExistingLink] = useState<string | undefined>(undefined)
    const fieldRef = useRef<HTMLInputElement>(null)

    const onSave = useCallback(() => {
        const value = fieldRef.current?.value
        if (value) {
            onSaveLink(value)
            onHide()
        }
    }, [onSaveLink, onHide])

    const onKeyDown: React.KeyboardEventHandler = useCallback(
        (event) => {
            if (isHotkey('Enter', event)) {
                event.stopPropagation()
                event.preventDefault()
                onSave()
            }
            if (isHotkey('Escape', event)) {
                event.stopPropagation()
                event.preventDefault()
                onHide()
            }
        },
        [onSave, onHide],
    )

    useEffect(() => {
        const linkEntry = findNode(editor, { match: { type: ELEMENT_LINK } })
        if (Array.isArray(linkEntry) && linkEntry[0]?.url) {
            setExistingLink(linkEntry[0].url as string)
        }
    }, [editor, setExistingLink])

    return (
        <ModalContainer onHide={onHide}>
            <Stack gap="lg" data-testid="editor-add-link-modal">
                <Text strong size="lg">
                    {existingLink ? 'Edit' : 'Add'} Link
                </Text>
                <TextField
                    autoFocus
                    ref={fieldRef}
                    height="input_md"
                    background="level2"
                    label="Link"
                    autoComplete="false"
                    type="text"
                    defaultValue={existingLink}
                    placeholder="e.g. https://mirror.xyz/"
                    onKeyDown={onKeyDown}
                />
                <Stack horizontal gap justifyContent="end">
                    <Button onClick={onHide}>Cancel</Button>
                    <Button tone="cta1" onClick={onSave}>
                        Save
                    </Button>
                </Stack>
            </Stack>
        </ModalContainer>
    )
}
