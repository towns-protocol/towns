import React, { useCallback, useEffect, useState } from 'react'
import {
    Attachment,
    Channel,
    EmbeddedMessageAttachment,
    OTWMention,
    SendTextMessageOptions,
    UnfurledLinkAttachment,
    useChannelId,
    useTownsContext,
    useUserLookupContext,
} from 'use-towns-client'
import { datadogRum } from '@datadog/browser-rum'
import every from 'lodash/every'
import isEqual from 'lodash/isEqual'
import { useMediaDropContext } from '@components/MediaDropContext/MediaDropContext'
import { ErrorBoundary } from '@components/ErrorBoundary/ErrorBoundary'
import { Box, BoxProps, Stack } from '@ui'
import {
    EditorAttachmentPreview,
    MessageAttachmentPreview,
} from '@components/EmbeddedMessageAttachement/EditorAttachmentPreview'
import { useInlineReplyAttchmentPreview } from '@components/EmbeddedMessageAttachement/hooks/useInlineReplyAttchmentPreview'
import { LoadingUnfurledLinkAttachment } from 'hooks/useExtractInternalLinks'
import { SECOND_MS } from 'data/constants'
import { RichTextEditor } from './RichTextEditor'
import { useEditorChannelData, useEditorMemberData } from './hooks/editorHooks'
import { getChannelNames, getMentionIds } from './utils/helpers'
import { EditorFallback } from './components/EditorFallback'
import { unfurlLinksToAttachments } from './utils/unfurlLinks'

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
    spaceMemberIds: string[] // List of all users in the space, regardless of whether they are in the channel
    mentions?: OTWMention[] // Used during editing - list of mentions in an existing message
    userId?: string
    isFullWidthOnTouch?: boolean
} & Pick<BoxProps, 'background'>

const TownsTextEditorWithoutBoundary = ({
    autoFocus,
    editing,
    editable = true,
    placeholder = 'Write something ...',
    tabIndex,
    threadId,
    threadPreview,
    storageId,
    onSend,
    onCancel,
    displayButtons,
    channels,
    mentions,
    spaceMemberIds,
    initialValue,
    background = 'level2',
}: Props) => {
    const { uploadFiles, files } = useMediaDropContext()
    const { inlineReplyPreview, onCancelInlineReply } = useInlineReplyAttchmentPreview()

    const [embeddedMessageAttachments, setEmbeddedMessageAttachments] = useState<
        EmbeddedMessageAttachment[]
    >([])
    const [unfurledLinkAttachments, setUnfurledAttachments] = useState<
        (UnfurledLinkAttachment | LoadingUnfurledLinkAttachment)[]
    >([])

    const channelId = useChannelId()
    const { lookupUser } = useUserLookupContext()
    const { userMentions, userHashMap } = useEditorMemberData(spaceMemberIds, channelId)
    const { channelMentions } = useEditorChannelData(channels)

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

    const onMessageLinksUpdated = useCallback(
        (messages: EmbeddedMessageAttachment[], links: UnfurledLinkAttachment[]) => {
            setEmbeddedMessageAttachments(messages)
            setUnfurledAttachments(links)
        },
        [],
    )

    const { casablancaClient } = useTownsContext()

    const sendMessage = useCallback(
        async (message: string, options: SendTextMessageOptions) => {
            if (!onSend) {
                return
            }

            const attachments: Attachment[] = []
            attachments.push(...embeddedMessageAttachments)
            attachments.push(...unfurledLinkAttachments)

            if (attachments.length > 0) {
                options.attachments = attachments
            }

            const isLoadingUnfurledLinkAttachment = (
                a: Attachment,
            ): a is LoadingUnfurledLinkAttachment =>
                a.type === 'unfurled_link' && 'isLoading' in a && a.isLoading === true

            const pendingUnfurls = attachments
                .filter(isLoadingUnfurledLinkAttachment)
                .map((a) => a.url)

            // used to defer the send event until the files are uploaded
            const deferredRef: { resolve?: () => void } = {}
            options.beforeSendEventHook = new Promise((resolve) => {
                deferredRef.resolve = resolve
            })
            // callback invoked when the local event has been added to the stream
            options.onLocalEventAppended = async (localId: string) => {
                // check if there are files yet to upload, if so await until ready
                if (uploadFiles && files?.length > 0) {
                    await uploadFiles(localId)
                }

                if (pendingUnfurls.length > 0) {
                    // find the related and update the local event before sending on wire
                    const stream = casablancaClient?.streams.get(channelId)
                    const event = stream?.view.events.get(localId)
                    const payload = event?.localEvent?.channelMessage.payload

                    if (payload?.case === 'post' && payload.value.content?.case === 'text') {
                        await Promise.race([
                            // max timeout
                            new Promise((resolve) => setTimeout(resolve, SECOND_MS * 10)),
                            unfurlLinksToAttachments(pendingUnfurls, payload.value.content.value),
                        ])

                        // remove links that didn't unfurl in time
                        payload.value.content.value.attachments =
                            payload.value.content.value.attachments.filter(
                                (a) =>
                                    !(a.content.case === 'unfurledUrl' && !a.content.value.title),
                            )
                    }
                }

                deferredRef.resolve?.()
            }

            onSend(message, options)
        },
        [
            onSend,
            embeddedMessageAttachments,
            unfurledLinkAttachments,
            uploadFiles,
            files?.length,
            casablancaClient?.streams,
            channelId,
        ],
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
                data-testid="editor-container"
                rounded={{ default: 'sm', touch: 'none' }}
            >
                <RichTextEditor
                    autoFocus={autoFocus}
                    editable={editable}
                    editing={editing}
                    initialValue={initialValue}
                    placeholder={placeholder}
                    tabIndex={tabIndex}
                    threadId={threadId}
                    threadPreview={threadPreview}
                    hasInlinePreview={!!inlineReplyPreview}
                    displayButtons={displayButtons}
                    background={background}
                    fileCount={files?.length}
                    channels={channels}
                    storageId={inlineReplyPreview?.event?.eventId ?? storageId}
                    userMentions={userMentions}
                    channelMentions={channelMentions}
                    userHashMap={userHashMap}
                    lookupUser={lookupUser}
                    unfurledLinkAttachments={unfurledLinkAttachments}
                    onMessageLinksUpdated={onMessageLinksUpdated}
                    onRemoveUnfurledLinkAttachment={onRemoveUnfurledLinkAttachment}
                    onSend={sendMessage}
                    onCancel={onCancel}
                />
            </Stack>
        </>
    )
}

const arePropsEqual = (prevProps: Props, nextProps: Props) => {
    return every(
        [
            isEqual(prevProps.editable, nextProps.editable),
            isEqual(prevProps.displayButtons, nextProps.displayButtons),
            isEqual(prevProps.placeholder, nextProps.placeholder),
            isEqual(prevProps.initialValue, nextProps.initialValue),
            isEqual(prevProps.threadId, nextProps.threadId),
            isEqual(prevProps.threadPreview, nextProps.threadPreview),
            isEqual(prevProps.isFullWidthOnTouch, nextProps.isFullWidthOnTouch),
            isEqual(getChannelNames(prevProps.channels), getChannelNames(nextProps.channels)),
            isEqual(prevProps.spaceMemberIds, nextProps.spaceMemberIds),
            isEqual(getMentionIds(prevProps.mentions), getMentionIds(nextProps.mentions)),
        ],
        true,
    )
}
const MemoizedTownsEditor = React.memo(TownsTextEditorWithoutBoundary, arePropsEqual)

export const TownsEditorContainer = (props: Props) => {
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
            <MemoizedTownsEditor {...props} />
        </ErrorBoundary>
    )
}
