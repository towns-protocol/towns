import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plate, PlateEditor, TElement, resetEditor } from '@udecode/plate-common'
import {
    Channel,
    EmbeddedMessageAttachment,
    Mention,
    MessageType,
    OTWMention,
    RoomMember,
    SendTextMessageOptions,
    UnfurledLinkAttachment,
    useChannelMembers,
    useNetworkStatus,
} from 'use-towns-client'
import { datadogRum } from '@datadog/browser-rum'
import { isEditorEmpty as PlateIsEditorEmpty } from '@udecode/slate-utils'
import { focusEditor } from '@udecode/slate-react'
import { TComboboxItemWithData } from '@udecode/plate-combobox'
import { ELEMENT_PARAGRAPH } from '@udecode/plate-paragraph'
import every from 'lodash/every'
import isEqual from 'lodash/isEqual'
import { useMediaDropContext } from '@components/MediaDropContext/MediaDropContext'
import { ErrorBoundary } from '@components/ErrorBoundary/ErrorBoundary'
import { Box, BoxProps, Stack } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { notUndefined } from 'ui/utils/utils'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import {
    EditorAttachmentPreview,
    MessageAttachmentPreview,
    UnfurledLinkAttachmentPreview,
} from '@components/EmbeddedMessageAttachement/EditorAttachmentPreview'
import { useInlineReplyAttchmentPreview } from '@components/EmbeddedMessageAttachement/hooks/useInlineReplyAttchmentPreview'
import { useInputStore } from 'store/store'
import { getChannelNames, getMentionIds, getUserIds } from './utils/helpers'
import { RichTextPlaceholder } from './components/RichTextEditorPlaceholder'
import { toMD } from './utils/toMD'
import { RememberInputPlugin } from './plugins/RememberInputPlugin'
import { deserializeMd } from './utils/deserializeMD'
import { channelMentionFilter, userMentionFilter } from './utils/mentions'
import { AtChannelUser, ComboboxTypes, TUserWithChannel } from './utils/ComboboxTypes'
import { EditorFallback } from './components/EditorFallback'
import { MentionCombobox } from './components/plate-ui/MentionCombobox'
import { Editor } from './components/plate-ui/Editor'
import { PlateToolbar } from './components/plate-ui/PlateToolbar'
import { RichTextBottomToolbar } from './components/RichTextBottomToolbar'
import { SendMarkdownPlugin } from './components/SendMarkdownPlugin'
import PlatePlugins from './plugins'
import { ELEMENT_MENTION_CHANNEL } from './plugins/createChannelPlugin'
import { EmojiPlugin } from './plugins/emoji/EmojiPlugin'
import { OnFocusPlugin } from './plugins/OnFocusPlugin'
import { PasteFilePlugin } from './components/PasteFilePlugin'
import { CaptureTownsLinkPlugin } from './components/CaptureTownsLinkPlugin'
import { OfflineIndicator } from './components/OfflineIndicator'
import { CaptureExternalLinkPlugin } from './components/CaptureExternalLinkPlugin'

type Props = {
    onSend?: (value: string, options: SendTextMessageOptions | undefined) => void
    onCancel?: () => void
    autoFocus?: boolean
    editable?: boolean
    editing?: boolean
    disabledSend?: boolean
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
    mentions?: OTWMention[]
    userId?: string
    isFullWidthOnTouch?: boolean
} & Pick<BoxProps, 'background'>

const EMPTY_NODE: TElement = {
    id: '1',
    type: ELEMENT_PARAGRAPH,
    children: [{ text: '' }],
}

const PlateEditorWithoutBoundary = ({
    editing: isEditing,
    editable = true,
    disabledSend = false,
    placeholder = 'Write something ...',
    tabIndex,
    onSend,
    onCancel,
    displayButtons,
    channels,
    mentions,
    users,
    initialValue: _initialValue,
    ...props
}: Props) => {
    const editorRef = useRef<PlateEditor<TElement[]>>(null)
    const editableContainerRef = useRef<HTMLDivElement>(null)

    const { isTouch } = useDevice()
    const { isOffline } = useNetworkStatus()
    const { uploadFiles, files, isUploadingFiles } = useMediaDropContext()
    const { inlineReplyPreview, onCancelInlineReply } = useInlineReplyAttchmentPreview()
    const [isSendingMessage, setIsSendingMessage] = useState(false)

    const [focused, setFocused] = useState(false)
    const [isEditorEmpty, setIsEditorEmpty] = useState(true)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isAttemptingSend, setIsAttemptingSend] = useState(false)
    const [isFormattingToolbarOpen, setIsFormattingToolbarOpen] = useState(false)
    const [embeddedMessageAttachments, setEmbeddedMessageAttachments] = useState<
        EmbeddedMessageAttachment[]
    >([])
    const [unfurledLinkAttachments, setUnfurledAttachments] = useState<UnfurledLinkAttachment[]>([])
    const disabled = isOffline || !editable || isSendingMessage
    const hasInlinePreview = !!inlineReplyPreview

    // hack: reset field + apply autoFocus when a new inline reply is opened
    // using the builtin focusEditor won't scroll the field into view on iOS
    const autoFocus = (isTouch && hasInlinePreview) || props.autoFocus
    const storageId = inlineReplyPreview?.event.eventId ?? props.storageId ?? 'editor'

    const userInput = useInputStore((state) =>
        storageId ? state.channelMessageInputMap[storageId] : undefined,
    )
    const valueFromStore = storageId ? userInput : undefined
    const setInput = useInputStore((state) => state.setChannelmessageInput)

    const { memberIds: _memberIds } = useChannelMembers()
    const memberIds = useMemo(() => new Set(_memberIds), [_memberIds])

    const userMentions: TComboboxItemWithData<TUserWithChannel>[] = useMemo(() => {
        return [AtChannelUser]
            .concat(users)
            .map((user) => ({
                text: getPrettyDisplayName(user),
                key: user.userId,
                data: { ...user, isChannelMember: memberIds.has(user.userId) },
            }))
            .filter(notUndefined)
    }, [users, memberIds])

    const channelMentions: TComboboxItemWithData<Channel>[] = useMemo(() => {
        return channels
            .map((channel) => ({
                text: channel.label,
                key: channel.id,
                data: channel,
            }))
            .filter(notUndefined)
    }, [channels])

    const initialValue = useMemo(() => {
        if (!_initialValue) {
            if (editable && valueFromStore && valueFromStore.trim().length > 0) {
                return deserializeMd(valueFromStore, channels, mentions, users)
            } else {
                return [{ ...EMPTY_NODE }]
            }
        }
        return deserializeMd(_initialValue, channels, mentions, users)
    }, [_initialValue, editable, valueFromStore, channels, mentions, users])

    const onFocusChange = useCallback(
        (focus: boolean) => {
            setFocused(focus)
        },
        [setFocused],
    )

    const onRemoveMessageAttachment = useCallback(
        (attachmentId: string) => {
            setEmbeddedMessageAttachments(
                embeddedMessageAttachments.filter((attachment) => attachment.id !== attachmentId),
            )
        },
        [embeddedMessageAttachments],
    )

    const onRemoveUnfurledLinkAttachment = useCallback(
        (attachmentId: string) => {
            setUnfurledAttachments(
                unfurledLinkAttachments.filter((attachment) => attachment.id !== attachmentId),
            )
        },
        [unfurledLinkAttachments],
    )

    const onMessageLinksUpdated = useCallback((links: EmbeddedMessageAttachment[]) => {
        setEmbeddedMessageAttachments(links)
    }, [])

    const onUnfurledLinksUpdated = useCallback((links: UnfurledLinkAttachment[]) => {
        setUnfurledAttachments(links)
    }, [])

    const onChange = useCallback(() => {
        if (editorRef.current) {
            const isEmpty = PlateIsEditorEmpty(editorRef.current)
            if (isEmpty !== isEditorEmpty) {
                setIsEditorEmpty(isEmpty)
            }
        }
    }, [isEditorEmpty])

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const onSendAttemptWhileDisabled = useCallback(() => {
        setIsAttemptingSend(true)
    }, [])

    const onFocus = useCallback(() => onFocusChange(true), [onFocusChange])

    /**
     * We want to delay the `onBlur` event to allow the user to click on the formatting toolbar icon
     * Without this delay, the bottom toolbar would disappear before `isFormattingToolbarOpen` is set to `true`
     *
     * {@link https://linear.app/hnt-labs/issue/HNT-5502/|HNT-5502}
     */
    const onBlur = useCallback(
        (e: React.FocusEvent) => {
            if (isTouch) {
                setTimeout(() => onFocusChange(false), 0)
            }
        },
        [isTouch, onFocusChange],
    )

    /** Reset the editor after sending a message and clear local storage value as well */
    const resetEditorAfterSend = useCallback(() => {
        setInput(storageId, '')
        if (editorRef.current) {
            resetEditor(editorRef.current)
            // Delay focusing the editor to wait for the editor to reset and re-render
            setTimeout(() => {
                if (editorRef.current) {
                    focusEditor(editorRef.current)
                }
            }, 100)
        }
        setIsSendingMessage(false)
    }, [setInput, storageId, setIsSendingMessage])

    const onSendCb = useCallback(
        async (message: string, mentions: Mention[]) => {
            if (isUploadingFiles) {
                return
            }
            setIsSendingMessage(true)

            const attachments = files.length > 0 ? (await uploadFiles?.()) ?? [] : []
            attachments.push(...embeddedMessageAttachments)
            attachments.push(...unfurledLinkAttachments)

            const options: SendTextMessageOptions = { messageType: MessageType.Text }
            if (mentions.length > 0) {
                options.mentions = mentions
            }
            if (attachments.length > 0) {
                options.attachments = attachments
            }
            onSend?.(message, options)
            resetEditorAfterSend()
        },
        [
            files.length,
            uploadFiles,
            embeddedMessageAttachments,
            unfurledLinkAttachments,
            onSend,
            isUploadingFiles,
            resetEditorAfterSend,
        ],
    )

    const handleSendOnEnter: React.KeyboardEventHandler = useCallback(
        async (event) => {
            if (!editorRef.current || isTouch || disabledSend || disabled) {
                return
            }

            const { key, shiftKey } = event
            if (key === 'Enter' && !shiftKey) {
                event.preventDefault()
                const { message, mentions } = await toMD(editorRef.current)
                if ((message && message.trim().length > 0) || files.length > 0) {
                    await onSendCb(message, mentions)
                }
            }
        },
        [onSendCb, isTouch, disabled, disabledSend, files.length],
    )

    const fileCount = files.length
    const background = isEditing && !isTouch ? 'level2' : 'level2'

    const sendButtons = (
        <SendMarkdownPlugin
            displayButtons={displayButtons ?? 'on-focus'}
            disabled={disabled || disabledSend}
            focused={focused}
            isEditing={isEditing ?? false}
            hasImage={fileCount > 0}
            key="markdownplugin"
            isEditorEmpty={isEditorEmpty}
            // onSendAttemptWhileDisabled={onSendAttemptWhileDisabled}
            onSend={onSendCb}
            onCancel={onCancel}
        />
    )

    return (
        <>
            <Box position="relative">
                <Box gap grow position="absolute" bottom="none" width="100%">
                    {embeddedMessageAttachments.map((attachment) => (
                        <MessageAttachmentPreview
                            key={attachment.id}
                            attachment={attachment}
                            onRemove={onRemoveMessageAttachment}
                        />
                    ))}
                    {inlineReplyPreview ? (
                        <EditorAttachmentPreview
                            type="reply"
                            displayName={inlineReplyPreview.displayName}
                            body={inlineReplyPreview.eventContent.body}
                            onRemoveClick={onCancelInlineReply}
                        />
                    ) : (
                        <></>
                    )}
                </Box>
            </Box>
            <Stack background={background} rounded={{ default: 'sm', touch: 'none' }}>
                <Plate
                    plugins={PlatePlugins}
                    editorRef={editorRef}
                    initialValue={initialValue}
                    key={`plate-${storageId}`}
                    onChange={onChange}
                >
                    <Stack horizontal width="100%" paddingRight="sm" alignItems="end">
                        <Box grow width="100%">
                            <PlateToolbar
                                readOnly={!editable}
                                focused={focused || !isEditorEmpty}
                                editing={isEditing}
                                background={background}
                                attemptingToSend={isAttemptingSend}
                                threadId={props.threadId}
                                threadPreview={props.threadPreview}
                                showFormattingToolbar={isFormattingToolbarOpen}
                                setIsFormattingToolbarOpen={setIsFormattingToolbarOpen}
                                key="editor"
                            />

                            <Box paddingX="md" position="relative" ref={editableContainerRef}>
                                <Editor
                                    readOnly={!editable}
                                    autoFocus={autoFocus}
                                    tabIndex={tabIndex}
                                    disabled={isSendingMessage}
                                    isTouch={isTouch}
                                    handleSendOnEnter={handleSendOnEnter}
                                    onFocus={onFocus}
                                    onBlur={onBlur}
                                />
                                {isEditorEmpty &&
                                    (!valueFromStore || valueFromStore.trim().length === 0) && (
                                        <RichTextPlaceholder placeholder={placeholder} />
                                    )}
                            </Box>
                            <OnFocusPlugin
                                autoFocus={autoFocus}
                                editorRef={editorRef}
                                onFocusChange={onFocusChange}
                            />
                            <CaptureTownsLinkPlugin onUpdate={onMessageLinksUpdated} />
                            <CaptureExternalLinkPlugin onUpdate={onUnfurledLinksUpdated} />
                            <EmojiPlugin />
                            <MentionCombobox<TUserWithChannel>
                                id={ComboboxTypes.userMention}
                                items={userMentions}
                                currentUser={props.userId}
                                filter={userMentionFilter}
                            />
                            <MentionCombobox<Channel>
                                pluginKey={ELEMENT_MENTION_CHANNEL}
                                id={ComboboxTypes.channelMention}
                                items={channelMentions}
                                filter={channelMentionFilter}
                            />
                            <OfflineIndicator attemptingToSend={isAttemptingSend} />
                            <RememberInputPlugin storageId={storageId} />
                        </Box>
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
                    <Stack
                        gap
                        shrink
                        horizontal
                        paddingX
                        paddingBottom="sm"
                        flexWrap="wrap"
                        pointerEvents={editable ? 'auto' : 'none'}
                    >
                        <RichTextBottomToolbar
                            editing={isEditing}
                            focused={focused}
                            threadId={props.threadId}
                            threadPreview={props.threadPreview}
                            visible={
                                !isTouch || focused || !isEditorEmpty || isFormattingToolbarOpen
                            }
                            isFormattingToolbarOpen={isFormattingToolbarOpen}
                            setIsFormattingToolbarOpen={setIsFormattingToolbarOpen}
                            key="toolbar"
                        />
                        <Box grow />
                        {isEditing && sendButtons}
                    </Stack>
                </Plate>
            </Stack>
        </>
    )
}

const arePropsEqual = (prevProps: Props, nextProps: Props) => {
    return every(
        [
            isEqual(prevProps.editable, nextProps.editable),
            isEqual(prevProps.disabledSend, nextProps.disabledSend),
            isEqual(prevProps.displayButtons, nextProps.displayButtons),
            isEqual(prevProps.placeholder, nextProps.placeholder),
            isEqual(prevProps.initialValue, nextProps.initialValue),
            isEqual(prevProps.threadId, nextProps.threadId),
            isEqual(prevProps.threadPreview, nextProps.threadPreview),
            isEqual(prevProps.isFullWidthOnTouch, nextProps.isFullWidthOnTouch),
            isEqual(getChannelNames(prevProps.channels), getChannelNames(nextProps.channels)),
            isEqual(getUserIds(prevProps.users), getUserIds(nextProps.users)),
            isEqual(getMentionIds(prevProps.mentions), getMentionIds(nextProps.mentions)),
        ],
        true,
    )
}
const MemoizedPlateEditor = React.memo(PlateEditorWithoutBoundary, arePropsEqual)

export const RichTextEditor = (props: Props) => {
    useEffect(() => {
        if (window.townsMeasureFlag && props.editable) {
            if (props.editable) {
                const durationTillEditable = Date.now() - window.townsAppStartTime
                window.townsMeasureFlag = false
                datadogRum.addAction('SendMessageEditable', {
                    durationTillEditable: durationTillEditable,
                })
            }
        }
    }, [props.editable])
    return (
        <ErrorBoundary FallbackComponent={EditorFallback}>
            <MemoizedPlateEditor {...props} />
        </ErrorBoundary>
    )
}
