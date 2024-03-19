import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plate, PlateEditor, TElement, createPlateEditor, resetEditor } from '@udecode/plate-common'
import {
    Channel,
    EmbeddedMessageAttachment,
    Mention,
    MessageType,
    RoomMember,
    SendTextMessageOptions,
    useNetworkStatus,
} from 'use-towns-client'
import { datadogRum } from '@datadog/browser-rum'
import { isEditorEmpty as PlateIsEditorEmpty } from '@udecode/slate-utils'
import { deserializeMd } from '@udecode/plate-serializer-md'
import { focusEditor } from '@udecode/slate-react'
import { TComboboxItemWithData } from '@udecode/plate-combobox'
import { useMediaDropContext } from '@components/MediaDropContext/MediaDropContext'
import { ErrorBoundary } from '@components/ErrorBoundary/ErrorBoundary'
import { Box, BoxProps, Stack } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { notUndefined } from 'ui/utils/utils'
import { SpaceProtocol, useEnvironment } from 'hooks/useEnvironmnet'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { toMD } from '@components/RichTextPlate/utils/toMD'
import {
    EditorAttachmentPreview,
    MessageAttachmentPreview,
} from '@components/EmbeddedMessageAttachement/EditorAttachmentPreview'
import { useInlineReplyAttchmentPreview } from '@components/EmbeddedMessageAttachement/hooks/useInlineReplyAttchmentPreview'
import { EditorFallback } from './components/EditorFallback'
import { MentionCombobox } from './components/plate-ui/MentionCombobox'
import { Editor } from './components/plate-ui/Editor'
import { PlateToolbar } from './components/plate-ui/PlateToolbar'
import { RichTextBottomToolbar } from './components/RichTextBottomToolbar'
import { RichTextPlaceholder } from './components/RichTextEditorPlaceholder'
import { SendMarkdownPlugin } from './components/SendMarkdownPlugin'
import PlatePlugins from './plugins'
import { ELEMENT_MENTION_CHANNEL } from './plugins/createChannelPlugin'
import { EmojiPlugin } from './plugins/emoji/EmojiPlugin'
import { OnFocusPlugin } from './plugins/OnFocusPlugin'
import { PasteFilePlugin } from './components/PasteFilePlugin'
import { CaptureTownsLinkPlugin } from './components/CaptureTownsLinkPlugin'
import { OfflineIndicator } from './components/OfflineIndicator'

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
            <PlateEditorWithoutBoundary {...props} />
        </ErrorBoundary>
    )
}

const PlateEditorWithoutBoundary = ({
    editing: isEditing,
    editable = true,
    placeholder = 'Write something ...',
    tabIndex,
    onSend,
    onCancel,
    displayButtons,
    initialValue: _initialValue,
    ...props
}: Props) => {
    const editorRef = useRef<PlateEditor<TElement[]>>(null)
    const editableContainerRef = useRef<HTMLDivElement>(null)

    const { protocol } = useEnvironment()
    const { isTouch } = useDevice()
    const { isOffline } = useNetworkStatus()
    const { uploadFiles, files, isUploadingFiles } = useMediaDropContext()
    const [isSendingMessage, setIsSendingMessage] = useState(false)

    const [focused, setFocused] = useState(true)
    const [isEditorEmpty, setIsEditorEmpty] = useState(true)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isAttemptingSend, setIsAttemptingSend] = useState(false)
    const [isFormattingToolbarOpen, setIsFormattingToolbarOpen] = useState(false)
    const [embeddedMessageAttachments, setEmbeddedMessageAttachments] = useState<
        EmbeddedMessageAttachment[]
    >([])
    const disabled = isOffline || !editable || isSendingMessage

    const initialValue = useMemo(() => {
        if (!_initialValue) {
            return [
                {
                    type: 'p',
                    children: [{ text: '' }],
                },
            ]
        }
        // #TODO: add support for ~~strikethrough~~, @mention, #channels and :emojis. Preserve new lines
        const tmpEditor = createPlateEditor({ plugins: PlatePlugins })
        return deserializeMd(tmpEditor, _initialValue)
    }, [_initialValue])

    const userMentions: TComboboxItemWithData<RoomMember>[] = useMemo(() => {
        return props.users
            .map((user) => ({
                text: getPrettyDisplayName(user),
                key: user.userId,
                data: user,
            }))
            .filter(notUndefined)
    }, [props.users])

    const channelMentions: TComboboxItemWithData<Channel>[] = useMemo(() => {
        return props.channels
            .map((channel) => ({
                text: channel.label,
                key: channel.id,
                data: channel,
            }))
            .filter(notUndefined)
    }, [props.channels])

    const onFocusChange = useCallback(
        (focus: boolean) => {
            setFocused(focus)
        },
        [setFocused],
    )

    const onRemoveAttachment = useCallback(
        (attachmentId: string) => {
            setEmbeddedMessageAttachments(
                embeddedMessageAttachments.filter((attachment) => attachment.id !== attachmentId),
            )
        },
        [embeddedMessageAttachments],
    )

    const onMessageLinksUpdated = useCallback((links: EmbeddedMessageAttachment[]) => {
        setEmbeddedMessageAttachments(links)
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

    const onSendCb = useCallback(
        async (message: string, mentions: Mention[]) => {
            if (isUploadingFiles) {
                return
            }
            setIsSendingMessage(true)

            const attachments = files.length > 0 ? (await uploadFiles?.()) ?? [] : []
            attachments.push(...embeddedMessageAttachments)

            const options: SendTextMessageOptions = { messageType: MessageType.Text }
            if (mentions.length > 0) {
                options.mentions = mentions
            }
            if (attachments.length > 0) {
                options.attachments = attachments
            }
            onSend?.(message, options)
            if (editorRef.current) {
                resetEditor(editorRef.current)
                focusEditor(editorRef.current)
            }
            setIsSendingMessage(false)
        },
        [
            files.length,
            uploadFiles,
            embeddedMessageAttachments,
            onSend,
            isUploadingFiles,
            setIsSendingMessage,
        ],
    )

    const handleSendOnEnter: React.KeyboardEventHandler = useCallback(
        async (event) => {
            if (!editorRef.current || isTouch) {
                return
            }

            const { key, shiftKey } = event
            if (key === 'Enter' && !shiftKey) {
                event.preventDefault()
                const { message, mentions } = await toMD(editorRef.current)
                if (!disabled && ((message && message.trim().length > 0) || files.length > 0)) {
                    await onSendCb(message, mentions)
                }
            }
        },
        [onSendCb, isTouch, disabled, files.length],
    )

    const fileCount = files.length
    const background = isEditing && !isTouch ? 'level1' : 'level2'

    const { inlineReplyPreview, onCancelInlineReply } = useInlineReplyAttchmentPreview()

    const hasInlinePreview = !!inlineReplyPreview

    // hack: reset field + apply autoFocus when a new inline reply is opened
    // using the builting focusEditor won't scroll the field into view on iOS
    const autoFocus = (isTouch && hasInlinePreview) || props.autoFocus
    const storageId = inlineReplyPreview?.event.eventId ?? props.storageId ?? 'editor'

    return (
        <>
            <Box position="relative">
                <Box gap grow position="absolute" bottom="none" width="100%">
                    {embeddedMessageAttachments.map((attachment) => (
                        <MessageAttachmentPreview
                            key={attachment.id}
                            attachment={attachment}
                            onRemove={onRemoveAttachment}
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
                                canShowInlineToolbar={!isTouch && !isFormattingToolbarOpen}
                                key="editor"
                            />

                            <Box paddingX="md" ref={editableContainerRef}>
                                <Editor
                                    readOnly={!editable}
                                    autoFocus={autoFocus}
                                    tabIndex={tabIndex}
                                    placeholder={placeholder}
                                    renderPlaceholder={RichTextPlaceholder}
                                    disabled={isSendingMessage}
                                    onKeyDown={handleSendOnEnter}
                                />
                            </Box>
                            <OnFocusPlugin
                                autoFocus={autoFocus}
                                editorRef={editorRef}
                                onFocusChange={onFocusChange}
                            />
                            <CaptureTownsLinkPlugin onUpdate={onMessageLinksUpdated} />
                            <EmojiPlugin />
                            <MentionCombobox<RoomMember>
                                id="users"
                                items={userMentions}
                                currentUser={props.userId}
                            />
                            <MentionCombobox<Channel>
                                pluginKey={ELEMENT_MENTION_CHANNEL}
                                id="channels"
                                items={channelMentions}
                            />
                            <OfflineIndicator attemptingToSend={isAttemptingSend} />
                        </Box>
                        <Box paddingY="sm" paddingRight="xs">
                            <SendMarkdownPlugin
                                displayButtons={displayButtons ?? 'on-focus'}
                                disabled={disabled}
                                focused={focused}
                                isEditing={isEditing ?? false}
                                hasImage={fileCount > 0}
                                key="markdownplugin"
                                isEditorEmpty={isEditorEmpty}
                                // onSendAttemptWhileDisabled={onSendAttemptWhileDisabled}
                                onSend={onSendCb}
                                onCancel={onCancel}
                            />
                        </Box>
                    </Stack>
                    <Stack
                        gap
                        shrink
                        paddingX
                        paddingBottom="sm"
                        pointerEvents={editable ? 'auto' : 'none'}
                    >
                        {protocol === SpaceProtocol.Casablanca && (
                            <PasteFilePlugin editableContainerRef={editableContainerRef} />
                        )}
                        <RichTextBottomToolbar
                            editing={isEditing}
                            focused={focused}
                            threadId={props.threadId}
                            threadPreview={props.threadPreview}
                            visible={!isTouch || focused || !isEditorEmpty}
                            isFormattingToolbarOpen={isFormattingToolbarOpen}
                            setIsFormattingToolbarOpen={setIsFormattingToolbarOpen}
                            key="toolbar"
                        />
                    </Stack>
                </Plate>
            </Stack>
        </>
    )
}
