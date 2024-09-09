import React, { useCallback, useRef } from 'react'
import { isHotkey } from '@udecode/plate-common'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { Button, Stack, Text, TextField } from '@ui'

export const AddLinkModal = ({
    onSaveLink,
    onHide,
}: {
    onHide: () => void
    onSaveLink: (link: string) => void
}) => {
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

    return (
        <ModalContainer onHide={onHide}>
            <Stack gap="lg" data-testid="editor-add-link-modal">
                <Text strong size="lg">
                    Add Link
                </Text>
                <TextField
                    autoFocus
                    ref={fieldRef}
                    height="input_md"
                    background="level2"
                    label="Link"
                    autoComplete="false"
                    type="text"
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
