import React, { startTransition, useCallback, useMemo, useRef, useState } from 'react'
import {
    Channel,
    EmbeddedMessageAttachment,
    LookupUserFn,
    MessageType,
    SendTextMessageOptions,
    UnfurledLinkAttachment,
} from 'use-towns-client'
import { Plate, PlateEditor, TElement, Value, resetEditor } from '@udecode/plate-common'
import { getEndPoint } from '@udecode/slate'
import { focusEditor } from '@udecode/slate-react'
import { ELEMENT_PARAGRAPH } from '@udecode/plate-paragraph'
import noop from 'lodash/noop'
import { UnfurledLinkAttachmentPreview } from '@components/EmbeddedMessageAttachement/EditorAttachmentPreview'
import { Box, BoxProps, Stack } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { useInputStore } from 'store/store'
import { LoadingUnfurledLinkAttachment } from 'hooks/useExtractInternalLinks'
import {
    TComboboxItemWithData,
    TUserIDNameMap,
    TUserWithChannel,
} from './components/plate-ui/autocomplete/types'
import { toMD } from './utils/toMD'
import { toPlainText } from './utils/toPlainText'
import { SendMarkdownPlugin } from './components/SendMarkdownPlugin'
import { isInputFocused } from './utils/helpers'
import { CaptureLinkAttachmentsPlugin } from './components/CaptureLinkAttachmentsPlugin'
import { PasteFilePlugin } from './components/PasteFilePlugin'
import { Editor } from './components/plate-ui/Editor'
import { EditorToolbarTop } from './components/EditorToolbarTop'
import { EditorToolbarBottom } from './components/EditorToolbarBottom'
import { RichTextPlaceholder } from './components/RichTextEditorPlaceholder'
import platePlugins from './plugins'
import { deserializeMd } from './utils/deserializeMD'
import { OnFocusPlugin } from './plugins/OnFocusPlugin'
import { RememberInputPlugin } from './plugins/RememberInputPlugin'

const EMPTY_NODE: TElement = {
    id: '1',
    type: ELEMENT_PARAGRAPH,
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
    /* callback invoked when user presses enter key or click send button  */
    onSend?: (
        message: string,
        options: Pick<SendTextMessageOptions, 'mentions' | 'messageType'>,
    ) => void
    onCancel?: () => void
    onChange?: (editor: PlateEditor<Value>) => void
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
    channels,
    lookupUser,
    unfurledLinkAttachments = [],
    onRemoveUnfurledLinkAttachment = noop,
    onMessageLinksUpdated = noop,
    onCancel = noop,
    onSend = noop,
    onChange = noop,
}: RichTextEditorProps) => {
    /* refs */
    const { isTouch } = useDevice()
    const storageId = useRef(_storageId ?? 'editor')
    const editorRef = useRef<PlateEditor<TElement[]>>(null)
    const editableContainerRef = useRef<HTMLDivElement>(null)

    /* state */
    const [isSendingMessage, setIsSendingMessage] = useState(false)
    const [focused, setFocused] = useState(false)
    const [editorText, setEditorText] = useState('')
    const [isEditorEmpty, setIsEditorEmpty] = useState(true)
    const [isFormattingToolbarOpen, setIsFormattingToolbarOpen] = useState(false)
    const [isOtherInputFocused] = useState(isInputFocused)

    const disabled = useMemo(() => !editable || isSendingMessage, [editable, isSendingMessage])
    const disabledSend = useMemo(() => typeof onSend !== 'function', [onSend])

    // hack: reset field + apply autoFocus when a new inline reply is opened
    // using the builtin focusEditor won't scroll the field into view on iOS
    const autoFocus = useMemo(
        () => (isTouch && hasInlinePreview) || _autoFocus,
        [isTouch, hasInlinePreview, _autoFocus],
    )

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

    /** Reset the editor after sending a message and clear local storage value as well */
    const resetEditorAfterSend = useCallback(() => {
        setInput(storageId.current, '')
        if (editorRef.current) {
            resetEditor(editorRef.current)
            // Delay focusing the editor to wait for the editor to reset and re-render
            setTimeout(() => {
                if (editorRef.current) {
                    focusEditor(editorRef.current, getEndPoint(editorRef.current, []))
                }
            }, 100)
        }
        setIsSendingMessage(false)
    }, [setInput, setIsSendingMessage])

    const onFocusChange = useCallback(
        (focus: boolean) => {
            setFocused(focus)
        },
        [setFocused],
    )

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
        setEditorText(' ')
        if (editorRef.current) {
            onChange(editorRef.current)
            const text = toPlainText(editorRef.current.children)
            const currentTextEmpty = text.trim().length === 0
            startTransition(() => {
                setEditorText(text)
                setIsEditorEmpty(currentTextEmpty)
            })
        }
    }, [setEditorText, setIsEditorEmpty, onChange])

    const sendMessage = useCallback(async () => {
        if (!editorRef.current) {
            return
        }
        if (editorText.length > 0 || fileCount > 0) {
            const { message, mentions } = await toMD(editorRef.current)
            onSend(message, {
                messageType: MessageType.Text,
                mentions: mentions.length > 0 ? mentions : undefined,
            })
            resetEditorAfterSend()
        }
    }, [editorText, fileCount, onSend, resetEditorAfterSend])

    const handleSendOnEnter: React.KeyboardEventHandler = useCallback(
        async (event) => {
            if (
                !editorRef.current ||
                isTouch ||
                disabledSend ||
                disabled ||
                (isEditorEmpty && fileCount === 0)
            ) {
                return
            }

            const { key, shiftKey } = event
            if (key === 'Enter' && !shiftKey) {
                event.preventDefault()
                await sendMessage()
            }
        },
        [isEditorEmpty, sendMessage, isTouch, disabled, disabledSend, fileCount],
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
            onCancel={onCancel}
        />
    )

    // force show floating toolbar in desktop when user selects text in editor
    const toolbarTop = (
        <EditorToolbarTop
            readOnly={!editable}
            focused={focused || !isEditorEmpty}
            editing={isEditing}
            editorId={editorRef.current?.id ?? ''}
            background={background}
            threadId={threadId}
            threadPreview={threadPreview}
            showFormattingToolbar={isFormattingToolbarOpen}
            setIsFormattingToolbarOpen={setIsFormattingToolbarOpen}
        />
    )

    return (
        <Plate
            normalizeInitialValue
            plugins={platePlugins(channels, userHashMap, userMentions, channelMentions, lookupUser)}
            editorRef={editorRef}
            initialValue={initialValue}
            key={`plate-${storageId.current}`}
            onChange={onChangeHandler}
        >
            {!isTouch && toolbarTop}
            <Stack horizontal width="100%" paddingRight="sm" alignItems="end">
                <Box grow paddingX="md" position="relative" ref={editableContainerRef}>
                    <Editor
                        readOnly={!editable}
                        autoFocus={autoFocus && !isOtherInputFocused}
                        tabIndex={tabIndex}
                        disabled={isSendingMessage}
                        isTouch={isTouch}
                        isEditing={isEditing}
                        isEditorEmpty={isEditorEmpty}
                        handleSendOnEnter={handleSendOnEnter}
                        onFocus={onFocus}
                        onBlur={onBlur}
                    />
                    {editorText.length === 0 &&
                        (!valueFromStore || valueFromStore.trim().length === 0) && (
                            <RichTextPlaceholder placeholder={placeholder} />
                        )}
                </Box>
                <OnFocusPlugin
                    autoFocus={autoFocus}
                    editorRef={editorRef}
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
            <Box paddingX="md" paddingBottom="sm">
                <PasteFilePlugin editableContainerRef={editableContainerRef} />
            </Box>
            {isTouch && toolbarTop}
            <Stack
                gap
                shrink
                horizontal
                paddingX
                paddingBottom="sm"
                flexWrap="wrap"
                pointerEvents={editable ? 'auto' : 'none'}
            >
                <EditorToolbarBottom
                    editing={isEditing}
                    focused={focused}
                    threadId={threadId}
                    threadPreview={threadPreview}
                    visible={
                        (isTouch && !isFormattingToolbarOpen && (focused || !isEditorEmpty)) ||
                        (!isTouch && (focused || !isEditorEmpty))
                    }
                    isFormattingToolbarOpen={isFormattingToolbarOpen}
                    setIsFormattingToolbarOpen={setIsFormattingToolbarOpen}
                    key="toolbar"
                />
                <Box grow />
                {isEditing && sendButtons}
            </Stack>
        </Plate>
    )
}
