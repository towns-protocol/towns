import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plate, PlateEditor, TElement, resetEditor } from '@udecode/plate-common'
import {
    Attachment,
    Channel,
    EmbeddedMessageAttachment,
    Mention,
    MessageType,
    OTWMention,
    SendTextMessageOptions,
    UnfurledLinkAttachment,
    useChannelId,
    useChannelMembers,
    useNetworkStatus,
    useUserLookupContext,
} from 'use-towns-client'
import { datadogRum } from '@datadog/browser-rum'
import { focusEditor } from '@udecode/slate-react'
import { TComboboxItemWithData } from '@udecode/plate-combobox'
import { ELEMENT_PARAGRAPH } from '@udecode/plate-paragraph'
import every from 'lodash/every'
import isEqual from 'lodash/isEqual'
import { isDMChannelStreamId, isGDMChannelStreamId } from '@river-build/sdk'
import { uniq } from 'lodash'
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
import { toPlainText } from './utils/toPlainText'
import { getChannelNames, getMentionIds, isInputFocused } from './utils/helpers'
import { RichTextPlaceholder } from './components/RichTextEditorPlaceholder'
import { toMD } from './utils/toMD'
import { RememberInputPlugin } from './plugins/RememberInputPlugin'
import { deserializeMd } from './utils/deserializeMD'
import { channelMentionFilter, getUserIdNameMap, userMentionFilter } from './utils/mentions'
import {
    AtChannelUser,
    ComboboxTypes,
    TUserIDNameMap,
    TUserWithChannel,
} from './utils/ComboboxTypes'
import { EditorFallback } from './components/EditorFallback'
import { MentionCombobox } from './components/plate-ui/MentionCombobox'
import { Editor } from './components/plate-ui/Editor'
import { PlateToolbar } from './components/plate-ui/PlateToolbar'
import { RichTextBottomToolbar } from './components/RichTextBottomToolbar'
import { SendMarkdownPlugin } from './components/SendMarkdownPlugin'
import platePlugins from './plugins'
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
    memberIds: string[] // List of all users in the space, regardless of whether they are in the channel
    mentions?: OTWMention[] // Used during editing - list of mentions in an existing message
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
    memberIds: spaceMemberIds,
    initialValue: _initialValue,
    ...props
}: Props) => {
    const editorRef = useRef<PlateEditor<TElement[]>>(null)
    const editableContainerRef = useRef<HTMLDivElement>(null)

    const { isTouch } = useDevice()
    const { isOffline } = useNetworkStatus()
    const { uploadFiles, files } = useMediaDropContext()
    const { inlineReplyPreview, onCancelInlineReply } = useInlineReplyAttchmentPreview()
    const [isSendingMessage, setIsSendingMessage] = useState(false)

    const [focused, setFocused] = useState(false)
    const [editorText, setEditorText] = useState('')
    const [isEditorEmpty, setIsEditorEmpty] = useState(true)
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

    const { memberIds: channelMemberIds } = useChannelMembers()

    const { lookupUser } = useUserLookupContext()

    const availableMemberIds = useMemo(
        () => uniq([...channelMemberIds, ...spaceMemberIds]),
        [channelMemberIds, spaceMemberIds],
    )

    const availableMembers = useMemo(
        () => availableMemberIds.map((userId) => lookupUser(userId)).filter(notUndefined),
        [availableMemberIds, lookupUser],
    )

    const channelId = useChannelId()

    const isDMorGDM = useMemo(
        () => isDMChannelStreamId(channelId) || isGDMChannelStreamId(channelId),
        [channelId],
    )

    const userMentions: TComboboxItemWithData<TUserWithChannel>[] = useMemo(() => {
        return (isDMorGDM ? [] : [AtChannelUser])
            .concat(availableMembers)
            .map((user) => ({
                text: getPrettyDisplayName(user),
                key: user.userId,
                data: { ...user, isChannelMember: channelMemberIds.includes(user.userId) },
            }))
            .filter(notUndefined)
    }, [isDMorGDM, availableMembers, channelMemberIds])

    const channelMentions: TComboboxItemWithData<Channel>[] = useMemo(() => {
        return channels
            .map((channel) => ({
                text: channel.label,
                key: channel.id,
                data: channel,
            }))
            .filter(notUndefined)
    }, [channels])

    const userIdNameMap: TUserIDNameMap = useMemo(() => {
        return getUserIdNameMap(availableMembers)
    }, [availableMembers])

    const initialValue = useMemo(() => {
        if (!_initialValue) {
            // restore draft
            if (editable && valueFromStore && valueFromStore.trim().length > 0) {
                return deserializeMd(valueFromStore, channels, userIdNameMap, lookupUser)
            } else {
                return [{ ...EMPTY_NODE }]
            }
        }
        // Editing a message
        return deserializeMd(_initialValue, channels, userIdNameMap, lookupUser)
    }, [_initialValue, channels, userIdNameMap, lookupUser, editable, valueFromStore])

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
            const text = toPlainText(editorRef.current.children)
            setEditorText(text)
            const currentTextEmpty = text.trim().length === 0
            if (currentTextEmpty !== isEditorEmpty) {
                setIsEditorEmpty(currentTextEmpty)
            }
        }
    }, [setEditorText, setIsEditorEmpty, isEditorEmpty])

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
            if (!onSend) {
                return
            }

            setIsSendingMessage(true)

            const attachments: Attachment[] = []
            attachments.push(...embeddedMessageAttachments)
            attachments.push(...unfurledLinkAttachments)

            const options: SendTextMessageOptions = {
                messageType: MessageType.Text,
            }

            if (mentions.length > 0) {
                options.mentions = mentions
            }

            if (attachments.length > 0) {
                options.attachments = attachments
            }

            if (uploadFiles && files?.length > 0) {
                // used to defer the send event until the files are uploaded
                const deferredRef: { resolve?: () => void } = {}
                options.beforeSendEventHook = new Promise((resolve) => {
                    deferredRef.resolve = resolve
                })
                // callback invoked when the local event has been added to the stream
                options.onLocalEventAppended = async (localId: string) => {
                    await uploadFiles(localId)
                    deferredRef.resolve?.()
                }
            }

            onSend(message, options)
            resetEditorAfterSend()
        },
        [
            onSend,
            embeddedMessageAttachments,
            unfurledLinkAttachments,
            uploadFiles,
            files?.length,
            resetEditorAfterSend,
        ],
    )

    const handleSendOnEnter: React.KeyboardEventHandler = useCallback(
        async (event) => {
            if (!editorRef.current || isTouch || disabledSend || disabled || isEditorEmpty) {
                return
            }

            const { key, shiftKey } = event
            if (key === 'Enter' && !shiftKey) {
                event.preventDefault()
                const { message, mentions } = await toMD(editorRef.current)
                if (editorText.length > 0 || files.length > 0) {
                    await onSendCb(message, mentions)
                }
            }
        },
        [isEditorEmpty, onSendCb, editorText, isTouch, disabled, disabledSend, files.length],
    )

    const fileCount = files.length
    const background = isEditing && !isTouch ? 'level2' : 'level2'

    const [isOtherInputFocused] = useState(isInputFocused)

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

    const plateFormattingToolbar = (
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
            <Stack
                background={background}
                data-testid="parent-stack"
                rounded={{ default: 'sm', touch: 'none' }}
            >
                <Plate
                    normalizeInitialValue
                    plugins={platePlugins(channels, userIdNameMap, lookupUser)}
                    editorRef={editorRef}
                    initialValue={initialValue}
                    key={`plate-${storageId}`}
                    onChange={onChange}
                >
                    {!isTouch && plateFormattingToolbar}
                    <Stack horizontal width="100%" paddingRight="sm" alignItems="end">
                        <Box grow paddingX="md" position="relative" ref={editableContainerRef}>
                            <Editor
                                readOnly={!editable}
                                autoFocus={autoFocus && !isOtherInputFocused}
                                tabIndex={tabIndex}
                                disabled={isSendingMessage}
                                isTouch={isTouch}
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
                        <CaptureTownsLinkPlugin onUpdate={onMessageLinksUpdated} />
                        <CaptureExternalLinkPlugin onUpdate={onUnfurledLinksUpdated} />
                        <EmojiPlugin />
                        <MentionCombobox<TUserWithChannel>
                            id={ComboboxTypes.userMention}
                            items={userMentions}
                            currentUser={props.userId}
                            filter={userMentionFilter}
                        />{' '}
                        <MentionCombobox<Channel>
                            pluginKey={ELEMENT_MENTION_CHANNEL}
                            id={ComboboxTypes.channelMention}
                            items={channelMentions}
                            filter={channelMentionFilter}
                        />
                        {!isTouch && <OfflineIndicator attemptingToSend={isAttemptingSend} />}
                        <RememberInputPlugin storageId={storageId} />
                        {!isEditing && sendButtons}
                    </Stack>
                    {isTouch && <OfflineIndicator attemptingToSend={isAttemptingSend} />}
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
                    {isTouch && plateFormattingToolbar}
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
            isEqual(prevProps.memberIds, nextProps.memberIds),
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
