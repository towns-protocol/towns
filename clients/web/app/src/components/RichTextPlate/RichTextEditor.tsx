import React, { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Channel, LookupUserFn, SendTextMessageOptions } from 'use-towns-client'
import { Plate, TPlateEditor } from '@udecode/plate-common/react'
import { TElement, getPointAfter, getPointBeforeLocation, resetEditor } from '@udecode/plate-common'
import noop from 'lodash/noop'
import {
    EmbeddedMessageAttachment,
    MessageType,
    TickerAttachment,
    UnfurledLinkAttachment,
} from '@river-build/sdk'
import {
    TickerAttachmentPreview,
    UnfurledLinkAttachmentPreview,
} from '@components/EmbeddedMessageAttachement/EditorAttachmentPreview'
import { Box, BoxProps, Stack } from '@ui'
import { isMacOS, useDevice } from 'hooks/useDevice'
import { useInputStore, useStore } from 'store/store'
import { LoadingUnfurledLinkAttachment } from 'hooks/useExtractInternalLinks'
import {
    TComboboxItemWithData,
    TMentionTicker,
    TUserIDNameMap,
    TUserWithChannel,
} from './components/plate-ui/autocomplete/types'
import { toMD } from './utils/toMD'
import { toPlainText } from './utils/toPlainText'
import { SendMarkdownPlugin } from './components/SendMarkdownPlugin'
import { focusEditorTowns, isInputFocused } from './utils/helpers'
import { CaptureLinkAttachmentsPlugin } from './components/CaptureLinkAttachmentsPlugin'
import { PasteFilePlugin } from './components/PasteFilePlugin'
import { RichTextPlaceholder } from './components/RichTextPlaceholder'
import { Editor } from './components/plate-ui/Editor'
import { EditorToolbarTop } from './components/EditorToolbarTop'
import { EditorToolbarBottom } from './components/EditorToolbarBottom'
import createTownsEditor from './plugins'
import { deserializeMd } from './utils/deserializeMD'
import { OnFocusPlugin } from './plugins/OnFocusPlugin'
import { RememberInputPlugin } from './plugins/RememberInputPlugin'

const EMPTY_NODE: TElement = {
    id: '1',
    type: 'p',
    children: [{ text: '' }],
}

type RichTextEditorProps = {
    tabIndex?: number
    threadId?: string
    threadPreview?: string
    editable?: boolean
    hasInlinePreview?: boolean
    displayButtons?: 'always' | 'on-focus'
    placeholder?: string
    fileCount?: number
    editing?: boolean
    autoFocus?: boolean
    storageId?: string
    background?: BoxProps['background']
    initialValue?: string
    /* hashmap of user `displayName` and `userId`. Used to convert pasted text into `mention` node */
    userHashMap: TUserIDNameMap
    /* users shown in @mention popup while typing */
    userMentions: TComboboxItemWithData<TUserWithChannel>[]
    /* channels shown in #channel popup while typing */
    channelMentions: TComboboxItemWithData<Channel>[]
    /* list of all channels in space */
    channels: Channel[]
    /* func to get user details by `userId`. Generally provided by `useUserLookupContext()` */
    lookupUser: LookupUserFn
    /* props related to attachment handling */
    unfurledLinkAttachments?: (UnfurledLinkAttachment | LoadingUnfurledLinkAttachment)[]
    onRemoveUnfurledLinkAttachment?: (attachmentId: string) => void
    onMessageLinksUpdated?: (
        messages: EmbeddedMessageAttachment[],
        links: UnfurledLinkAttachment[],
    ) => void
    tickerAttachments?: TickerAttachment[]
    onSelectTicker?: (ticker: TMentionTicker) => void
    onRemoveTicker?: (address: string, chain: string) => void
    /* callback invoked when user presses enter key or click send button  */
    onSend?: (
        message: string,
        options: Pick<SendTextMessageOptions, 'mentions' | 'messageType' | 'emptyMessage'>,
    ) => void
    onCancel?: () => void
    onChange?: (editor: TPlateEditor) => void
    onArrowEscape?: (direction: 'up' | 'down') => void
    renderSendButton?: (onSend: () => void) => React.ReactNode
    renderTradingBottomBar?: React.ReactNode
    allowEmptyMessage?: boolean
}

export const RichTextEditor = ({
    tabIndex,
    threadId,
    threadPreview,
    editable = true,
    hasInlinePreview = false,
    displayButtons = 'always',
    placeholder = 'Write something ...',
    fileCount = 0,
    editing: isEditing = false,
    autoFocus: _autoFocus = true,
    storageId: _storageId,
    background = 'level2',
    initialValue: _initialValue,
    userHashMap,
    userMentions,
    channelMentions,
    tickerAttachments = [],
    channels,
    lookupUser,
    unfurledLinkAttachments = [],
    onArrowEscape,
    onRemoveUnfurledLinkAttachment = noop,
    onMessageLinksUpdated = noop,
    onSelectTicker = noop,
    onRemoveTicker = noop,
    onCancel = noop,
    onSend = noop,
    onChange = noop,
    renderSendButton,
    renderTradingBottomBar,
    allowEmptyMessage = false,
}: RichTextEditorProps) => {
    /* refs */
    const { isTouch, isAndroid } = useDevice()
    const storageId = useRef(_storageId ?? 'editor')
    const editableContainerRef = useRef<HTMLDivElement>(null)

    /* state */
    const [isSendingMessage, setIsSendingMessage] = useState(false)
    const [focused, setFocused] = useState(false)
    const [editorText, setEditorText] = useState('')
    const [isEditorEmpty, setIsEditorEmpty] = useState(true)
    const [isFormattingToolbarOpen, setIsFormattingToolbarOpen] = useState(false)
    const [isOtherInputFocused] = useState(isInputFocused)

    const valueFromStore = useInputStore((state) => state.channelMessageInputMap[storageId.current])
    const setInput = useInputStore((state) => state.setChannelmessageInput)

    const initialValue = useMemo(() => {
        /* used when editing a message: convert initial value passed as prop from MD string to Plate JSON  */
        if (_initialValue) {
            return deserializeMd(_initialValue, channels, userHashMap, lookupUser)
        }
        /* used to restore a draft message from local storage */
        if (editable && valueFromStore && valueFromStore.trim().length > 0) {
            return deserializeMd(valueFromStore, channels, userHashMap, lookupUser)
        }
        /* If all else fails, set Plate JSON as default empty string  */
        return [{ ...EMPTY_NODE }]
    }, [_initialValue, channels, userHashMap, lookupUser, editable, valueFromStore])

    const userMentionsRef = useRef(userMentions)
    userMentionsRef.current = userMentions

    const channelMentionsRef = useRef(channelMentions)
    channelMentionsRef.current = channelMentions

    const [editor] = useState<TPlateEditor>(() =>
        createTownsEditor(
            storageId.current,
            channels,
            userHashMap,
            () => userMentionsRef.current,
            () => channelMentionsRef.current,
            initialValue,
            lookupUser,
            onSelectTicker,
        ),
    )
    const disabled = useMemo(() => !editable || isSendingMessage, [editable, isSendingMessage])
    const disabledSend = useMemo(() => typeof onSend !== 'function', [onSend])

    /**
     * For Android devices, we need to show a placeholder as an absolute positioned JSX element
     * because the native PlateJS placeholder causes issues with @mentions and #channels, where the
     * caret position is moved to the left when user types a mention or channel
     *
     * For other devices, we just need to pass the placeholder string to the PlateJS <Editor /> component
     */
    const showAndroidPlaceholder = useMemo(
        () => isAndroid() && editorText.length === 0,
        [isAndroid, editorText],
    )

    // hack: reset field + apply autoFocus when a new inline reply is opened
    // using the builtin focusEditor won't scroll the field into view on iOS
    const autoFocus = useMemo(
        () => (isTouch && hasInlinePreview) || isEditing || _autoFocus,
        [isTouch, hasInlinePreview, _autoFocus, isEditing],
    )

    useEffect(() => {
        if (autoFocus && !isInputFocused()) {
            focusEditorTowns(editor, true)
        }
    }, [autoFocus, editor])

    /** Reset the editor after sending a message and clear local storage value as well */
    const resetEditorAfterSend = useCallback(() => {
        setInput(storageId.current, '')
        if (editor) {
            resetEditor(editor)
            // Delay focusing the editor to wait for the editor to reset and re-render
            setTimeout(() => {
                focusEditorTowns(editor, !isEditing || isTouch)
            }, 100)
        }
        setIsSendingMessage(false)
    }, [setInput, editor, isEditing, isTouch])

    const onFocusChange = useCallback((focus: boolean) => {
        setFocused(focus)
    }, [])

    const onFocus = useCallback(() => onFocusChange(true), [onFocusChange])

    /**
     * We want to delay the `onBlur` event to allow the user to click on the formatting toolbar icon
     * Without this delay, the bottom toolbar would disappear before `isFormattingToolbarOpen` is set to `true`
     *
     * {@link https://linear.app/hnt-labs/issue/HNT-5502/|HNT-5502}
     */
    const onBlur = useCallback(() => {
        if (isTouch) {
            setTimeout(() => onFocusChange(false), 0)
        }
    }, [isTouch, onFocusChange])

    const onChangeHandler = useCallback(() => {
        /**
         * `editorText` is used to check if the editor is empty or not and display the placeholder
         * on mobile devices, this is often slow because of the way the editor is rendered and
         * its children are updated.
         *
         * As a workaround, we set the editor text to a space character to remove the placeholder
         * on any manual input change. The reconciliation of the actual editor text is completed later
         */
        if (editor) {
            onChange(editor)
            const text = toPlainText(editor.children)
            const currentTextEmpty = text.trim().length === 0
            startTransition(() => {
                setEditorText(text)
                setIsEditorEmpty(currentTextEmpty)
            })
        }
    }, [editor, onChange])

    const sendMessage = useCallback(async () => {
        if (!editor) {
            return
        }
        if (editorText.length > 0 || fileCount > 0) {
            const { message, mentions } = await toMD(editor)
            onSend(message, {
                messageType: MessageType.Text,
                mentions: mentions.length > 0 ? mentions : undefined,
            })
            resetEditorAfterSend()
        } else if (allowEmptyMessage) {
            onSend('', {
                messageType: MessageType.Text,
                emptyMessage: true,
            })
            resetEditorAfterSend()
        }
    }, [allowEmptyMessage, editor, editorText.length, fileCount, onSend, resetEditorAfterSend])

    // Update the editor text in the component state one time when the editor is initialized
    // After the editor is initialized, the editor text is updated in the `onChange` handler
    useEffect(() => {
        onChangeHandler()
    }, [onChangeHandler])

    /**
     * When the user presses the arrow keys, we want to exit the editor if the cursor is at the top or bottom
     * of the editor. This is to allow the user to navigate to the previous or next message in the thread
     *
     * @see TOWNS-4187
     */
    const exitEditorOnArrow: React.KeyboardEventHandler = useCallback(
        (event) => {
            if (!onArrowEscape || !editor || !editor.selection) {
                return
            }

            if (event.key === 'ArrowUp' && !getPointBeforeLocation(editor, editor.selection)) {
                onArrowEscape('up')
            } else if (event.key === 'ArrowDown' && !getPointAfter(editor, editor.selection)) {
                onArrowEscape('down')
            }
        },
        [editor, onArrowEscape],
    )

    /**
     * We need to do this for Android ONLY, to prevent the placeholder from showing up while typing,
     * since soft keyboard `onChange` events are not quick enough, and leads to overlapping placeholders
     * for a brief moment.
     *
     * In this case, we set the editor text to a space character to remove the placeholder on any manual input change
     *
     * For other devices, we don't need to do this, as the placeholder is handled by the PlateJS library
     * @see showAndroidPlaceholder
     */
    const hideAndroidPlaceholder = useCallback(() => {
        if (editorText.length === 0 && isAndroid()) {
            setEditorText(' ')
        }
    }, [editorText, isAndroid])

    const sendWithCmdEnter = useStore((state) => state.sendWithCmdEnter)
    const isDarwin = isMacOS()

    const customKeydownHandler: React.KeyboardEventHandler = useCallback(
        async (event) => {
            /** On desktop, we want to exit the editor if the user presses up/down  */
            if (!isTouch && event.key.includes('Arrow')) {
                exitEditorOnArrow(event)
            }
            if (
                !editor ||
                isTouch ||
                disabledSend ||
                disabled ||
                (isEditorEmpty && fileCount === 0)
            ) {
                return
            }

            const { key, metaKey, ctrlKey, shiftKey } = event
            const modifierPressed = isDarwin ? metaKey : ctrlKey
            if (key === 'Enter') {
                if (shiftKey) {
                    // shift+enter should create a new line
                    return
                }
                if (sendWithCmdEnter) {
                    if (modifierPressed) {
                        event.preventDefault()
                        await sendMessage()
                    }
                } else {
                    event.preventDefault()
                    await sendMessage()
                }
            }
        },
        [
            isTouch,
            editor,
            disabledSend,
            disabled,
            isEditorEmpty,
            fileCount,
            isDarwin,
            sendWithCmdEnter,
            exitEditorOnArrow,
            sendMessage,
        ],
    )

    const sendButtons = (
        <SendMarkdownPlugin
            displayButtons={displayButtons ?? 'on-focus'}
            disabled={disabled || disabledSend}
            focused={focused}
            isEditing={isEditing ?? false}
            hasImage={fileCount > 0}
            key="markdownplugin"
            isEditorEmpty={isEditorEmpty}
            sendMessage={sendMessage}
            renderSendButton={renderSendButton}
            onCancel={onCancel}
        />
    )

    // force show floating toolbar in desktop when user selects text in editor
    const toolbarTop = useMemo(() => {
        return (
            <EditorToolbarTop
                readOnly={!editable}
                focused={focused || !isEditorEmpty}
                editing={isEditing}
                background={background}
                threadId={threadId}
                threadPreview={threadPreview}
                showFormattingToolbar={isFormattingToolbarOpen}
                setIsFormattingToolbarOpen={setIsFormattingToolbarOpen}
            />
        )
    }, [
        editable,
        background,
        focused,
        isEditorEmpty,
        isEditing,
        isFormattingToolbarOpen,
        threadId,
        threadPreview,
    ])

    return (
        <Plate editor={editor} key={`plate-${storageId.current}`} onValueChange={onChangeHandler}>
            {!isTouch && toolbarTop}
            <Box position="relative">
                <Stack horizontal width="100%" paddingRight="sm" alignItems="end">
                    <Box grow paddingX="md" position="relative" ref={editableContainerRef}>
                        <Editor
                            data-testid="send-message-text-box"
                            readOnly={!editable}
                            autoFocus={autoFocus && !isOtherInputFocused}
                            tabIndex={tabIndex}
                            disabled={isSendingMessage}
                            placeholder={placeholder}
                            isEditing={isEditing}
                            hideAndroidPlaceholder={hideAndroidPlaceholder}
                            customKeydownHandler={customKeydownHandler}
                            onFocus={onFocus}
                            onBlur={onBlur}
                        />
                        {showAndroidPlaceholder && (
                            <RichTextPlaceholder placeholder={placeholder} />
                        )}
                    </Box>
                    <OnFocusPlugin
                        autoFocus={autoFocus}
                        editor={editor}
                        onFocusChange={onFocusChange}
                    />
                    <CaptureLinkAttachmentsPlugin onUpdate={onMessageLinksUpdated} />
                    <RememberInputPlugin storageId={storageId.current} />
                    {!isEditing && sendButtons}
                </Stack>
                {unfurledLinkAttachments.length > 0 && (
                    <Box horizontal gap padding flexWrap="wrap" width="100%">
                        {unfurledLinkAttachments.map((attachment) => (
                            <UnfurledLinkAttachmentPreview
                                key={attachment.id}
                                attachment={attachment}
                                onRemove={onRemoveUnfurledLinkAttachment}
                            />
                        ))}
                    </Box>
                )}
                {tickerAttachments.length > 0 && (
                    <Box horizontal gap padding flexWrap="wrap" width="100%">
                        {tickerAttachments.map((attachment) => (
                            <TickerAttachmentPreview
                                key={attachment.id}
                                attachment={attachment}
                                onRemove={onRemoveTicker}
                            />
                        ))}
                    </Box>
                )}
                <Stack paddingX paddingBottom="sm">
                    <PasteFilePlugin editableContainerRef={editableContainerRef} />

                    {isTouch && toolbarTop}
                    <Stack
                        gap
                        shrink
                        horizontal
                        flexWrap="wrap"
                        pointerEvents={editable ? 'auto' : 'none'}
                    >
                        <EditorToolbarBottom
                            editing={isEditing}
                            focused={focused}
                            threadId={threadId}
                            threadPreview={threadPreview}
                            visible={
                                (isTouch &&
                                    !isFormattingToolbarOpen &&
                                    (focused || !isEditorEmpty)) ||
                                (!isTouch && (focused || !isEditorEmpty))
                            }
                            isFormattingToolbarOpen={isFormattingToolbarOpen}
                            setIsFormattingToolbarOpen={setIsFormattingToolbarOpen}
                            key="toolbar"
                        />
                        <Box grow />
                        {isEditing && sendButtons}
                        {!editable && (
                            <Box
                                absoluteFill
                                borderRadius="sm"
                                background="level2"
                                opacity="0.7"
                                pointerEvents="all"
                            />
                        )}
                        {renderTradingBottomBar}
                    </Stack>
                </Stack>
            </Box>
        </Plate>
    )
}
