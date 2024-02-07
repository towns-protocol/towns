import React, { KeyboardEventHandler, useCallback, useMemo, useState } from 'react'
import { Descendant, Node, createEditor } from 'slate'
import { withHistory } from 'slate-history'
import { Editable, Slate, withReact } from 'slate-react'
import { clsx } from 'clsx'
import { Channel, MessageType, RoomMember, SendTextMessageOptions } from 'use-zion-client'
import { serialize } from 'remark-slate'
import * as fieldStyles from 'ui/components/_internal/Field/Field.css'
import { Box, BoxProps, Stack } from '@ui'
import { Placeholder } from '@components/RichTextSlate/ui/Placeholder'
import { useMediaDropContext } from '@components/MediaDropContext/MediaDropContext'
import { SendMarkdownPlugin } from './SendMarkdownPlugin'
import * as styles from './RichTextEditor.css'
import { useDevice } from '../../hooks/useDevice'
import { handleDOMBeforeInput } from './utils/handleDOMBeforeInput'
import { withMDShortcuts } from './utils/withMDShortcuts'
import withSchema from './hooks/withSchema'
import { LeafElement } from './ui/LeafElement'
import Element from './ui/Element'
import { useNetworkStatus } from '../../hooks/useNetworkStatus'
import { RichTextBottomToolbar } from './RichTextBottomToolbar'

type Props = {
    onSend?: (value: string, options: SendTextMessageOptions | undefined) => void
    onCancel?: () => void
    autoFocus?: boolean
    editable?: boolean
    editing?: boolean
    placeholder?: string
    initialValue?: string
    displayButtons?: 'always' | 'on-focus'
    container?: (props: { children: React.ReactNode }) => JSX.Element
    tabIndex?: number
    storageId?: string
    threadId?: string // only used for giphy plugin
    threadPreview?: string
    channels: Channel[]
    users: RoomMember[]
    userId?: string
    isFullWidthOnTouch?: boolean
} & Pick<BoxProps, 'background'>

const inputClassName = clsx([fieldStyles.field, styles.richText, styles.contentEditable])

const initialValue: Descendant[] = [
    {
        type: 'paragraph',
        children: [{ text: '' }],
    },
]
const RichTextSlate: React.FC<Props> = ({
    placeholder = 'Write something...',
    editing: isEditing,
    editable = true,
    onSend,
    ...restProps
}) => {
    const { isTouch } = useDevice()
    const { isOffline } = useNetworkStatus()
    const { uploadFiles, files } = useMediaDropContext()
    const fileCount = files.length
    const [editor] = useState(() =>
        withSchema(withMDShortcuts(withReact(withHistory(createEditor())))),
    )
    const useHandleDOMBeforeInput = useMemo(() => handleDOMBeforeInput(editor), [editor])

    const background = isEditing && !isTouch ? 'level1' : 'level2'

    const onSendCb = useCallback(async () => {
        console.log('**** VALUES ***', editor.children)
        const message = editor.children
            .map((c) => {
                if (Node.string(c) === '') {
                    return '\n'
                } else {
                    return serialize(c)
                }
            })
            .join('\n')

        console.log('**** MD ****', message)
        if (!message || message.trim() === '') {
            return
        }
        const attachments = files.length > 0 ? (await uploadFiles?.()) ?? [] : []

        const options: SendTextMessageOptions = { messageType: MessageType.Text }
        if (attachments.length > 0) {
            options.attachments = attachments
        }
        onSend?.(message, options)

        // Clear editor back to old state
        const point = { path: [0, 0], offset: 0 }
        editor.selection = { anchor: point, focus: point }
        // For good measure, you can reset the history as well
        editor.history = { redos: [], undos: [] }
        // Reset things back to their original (empty) state
        editor.children = initialValue
    }, [editor, onSend, files, uploadFiles])

    const onKeyDown: KeyboardEventHandler<HTMLDivElement> = useCallback(
        (event) => {
            if (event.key === 'Enter') {
                if (!event.shiftKey) {
                    event.preventDefault()
                    onSendCb().catch((err) => {})
                }
            }
        },
        [onSendCb],
    )
    return (
        <>
            <Stack
                background={background}
                rounded={{ default: 'sm', touch: 'none' }}
                borderLeft={!isTouch ? 'default' : 'none'}
                borderRight={!isTouch ? 'default' : 'none'}
                borderTop="default"
                borderBottom={!isTouch ? 'default' : 'none'}
            >
                <Slate editor={editor} initialValue={initialValue}>
                    <Stack horizontal width="100%" paddingRight="sm" alignItems="end">
                        <Box grow width="100%">
                            <Editable
                                spellCheck
                                autoFocus
                                className={inputClassName}
                                placeholder={placeholder}
                                renderPlaceholder={Placeholder}
                                renderElement={Element}
                                renderLeaf={LeafElement}
                                onKeyDown={onKeyDown}
                                onDOMBeforeInput={useHandleDOMBeforeInput}
                            />
                        </Box>
                        <Box paddingY="sm" paddingRight="xs">
                            <SendMarkdownPlugin
                                displayButtons={restProps.displayButtons ?? 'on-focus'}
                                disabled={isOffline || !editable}
                                focused={false}
                                isEditing={isEditing ?? false}
                                isEditorEmpty={!editor.children}
                                setIsEditorEmpty={() => {}}
                                hasImage={fileCount > 0}
                                key="markdownplugin"
                                onSend={onSendCb}
                                onSendAttemptWhileDisabled={() => {}}
                                onCancel={restProps.onCancel}
                            />
                        </Box>
                    </Stack>
                    {!isTouch && (
                        <Stack
                            gap
                            shrink
                            paddingX
                            paddingBottom="sm"
                            pointerEvents={editable ? 'auto' : 'none'}
                        >
                            <RichTextBottomToolbar
                                editing={isEditing}
                                focused={false}
                                threadId={restProps.threadId}
                                threadPreview={restProps.threadPreview}
                                visible={!isTouch}
                                isFormattingToolbarOpen={false}
                                setIsFormattingToolbarOpen={() => null}
                                key="toolbar"
                            />
                        </Stack>
                    )}
                </Slate>
            </Stack>
        </>
    )
}

export default RichTextSlate
