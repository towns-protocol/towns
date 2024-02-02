import React, { useMemo } from 'react'
import { Descendant, createEditor } from 'slate'
import { withHistory } from 'slate-history'
import { Editable, Slate, withReact } from 'slate-react'
import { clsx } from 'clsx'
import { Channel, RoomMember, SendTextMessageOptions } from 'use-zion-client'
import * as fieldStyles from 'ui/components/_internal/Field/Field.css'
import { Box, BoxProps, Stack } from '@ui'
import * as styles from './RichTextEditor.css'
import { useDevice } from '../../hooks/useDevice'

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

const RichTextSlate: React.FC<Props> = ({
    placeholder = 'Write something...',
    editing: isEditing,
}) => {
    const { isTouch } = useDevice()
    const editor = useMemo(() => withReact(withHistory(createEditor())), [])

    const background = isEditing && !isTouch ? 'level1' : 'level2'

    const initialValue: Descendant[] = [
        {
            type: 'paragraph',
            children: [{ text: '' }],
        },
    ]

    return (
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
                            disableDefaultStyles
                            className={inputClassName}
                            placeholder={placeholder}
                            // onDOMBeforeInput={handleDOMBeforeInput}
                        />
                    </Box>
                </Stack>
            </Slate>
        </Stack>
    )
}

export default RichTextSlate
