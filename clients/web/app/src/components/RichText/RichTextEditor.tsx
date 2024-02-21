import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin'
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin'
import { ClearEditorPlugin } from '@lexical/react/LexicalClearEditorPlugin'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary'
import { clsx } from 'clsx'
import React, { useCallback, useEffect, useState } from 'react'
import {
    Channel,
    EmbeddedMessageAttachment,
    Mention,
    MessageType,
    RoomMember,
    SendTextMessageOptions,
} from 'use-zion-client'
import { datadogRum } from '@datadog/browser-rum'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getRoot } from 'lexical'
import { ErrorBoundary } from '@components/ErrorBoundary/ErrorBoundary'
import * as fieldStyles from 'ui/components/_internal/Field/Field.css'
import { useInputStore } from 'store/store'
import { Box, BoxProps, Stack } from '@ui'
import { useNetworkStatus } from 'hooks/useNetworkStatus'
import { SomethingWentWrong } from '@components/Errors/SomethingWentWrong'
import { useDevice } from 'hooks/useDevice'
import { SpaceProtocol, useEnvironment } from 'hooks/useEnvironmnet'
import { useMediaDropContext } from '@components/MediaDropContext/MediaDropContext'
import { useThrottledValue } from 'hooks/useThrottledValue'
import { SECOND_MS } from 'data/constants'
import { useExtractMessageAttachments } from 'hooks/useExtractMessageAttachments'
import { EmbeddedMessagePreview } from '@components/EmbeddedMessageAttachement/EmbeddedMessagePreview'
import { useInitialConfig } from './hooks/useInitialConfig'
import { AutoLinkMatcherPlugin } from './plugins/AutoLinkMatcherPlugin'
import { ChannelMentionPlugin } from './plugins/ChannelMentionPlugin'
import { EmojiReplacePlugin } from './plugins/EmojiReplacePlugin'
import { EmojiShortcutPlugin } from './plugins/EmojiShortcutPlugin'
import ListMaxIndentLevelPlugin from './plugins/ListMaxIndentLevelPlugin'
import { MentionsPlugin } from './plugins/MentionsPlugin'
import { OnFocusPlugin } from './plugins/OnFocusPlugin'
import { SendMarkdownPlugin } from './plugins/SendMarkdownPlugin'
import * as styles from './RichTextEditor.css'
import { RichTextPlaceholder } from './ui/Placeholder/RichTextEditorPlaceholder'
import { RichTextUI } from './ui/RichTextEditorUI'
import { RememberInputPlugin } from './plugins/RememberInputPlugin'
import CodeHighlightPlugin from './plugins/CodeHighlightPlugin'
import { TabIndentationPlugin } from './plugins/TabIndentationPlugin'
import { RichTextBottomToolbar } from './RichTextBottomToolbar'
import { PasteFilePlugin } from './plugins/PasteFilePlugin'
import { useTransformers } from './transformers/useTransformers'
import { nodeTypeList } from './nodes/nodeList'

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

export const RichTextEditor = (props: Props) => {
    React.useEffect(() => {
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
        <ErrorBoundary FallbackComponent={RichTextEditorFallbackComponent}>
            <RichTextEditorWithoutBoundary {...props} />
        </ErrorBoundary>
    )
}

const RichTextEditorWithoutBoundary = React.memo((props: Props) => {
    const {
        editable = true,
        userId,
        users: members,
        channels,
        placeholder = 'Write something ...',
        editing: isEditing,
        onSend,
        tabIndex,
    } = props

    const { transformers } = useTransformers({ members, channels })
    const { isTouch } = useDevice()
    const [isEditorEmpty, setIsEditorEmpty] = useState(true)
    const { protocol } = useEnvironment()
    const { uploadFiles, files } = useMediaDropContext()
    const fileCount = files.length

    const userInput = useInputStore((state) =>
        props.storageId ? state.channelMessageInputMap[props.storageId] : undefined,
    )

    const valueFromStore = props.storageId ? userInput : undefined

    const initialConfig = useInitialConfig(
        props.initialValue || (editable ? valueFromStore : ''),
        nodeTypeList,
        transformers,
        editable,
    )
    const [isFormattingToolbarOpen, setIsFormattingToolbarOpen] = useState(false)

    const [focused, setFocused] = useState(false)
    const onFocusChange = useCallback(
        (focus: boolean) => {
            setFocused(focus)
        },
        [setFocused],
    )

    const { isOffline } = useNetworkStatus()
    const [isAttemptingSend, setIsAttemptingSend] = useState(false)

    const [embeddedMessageAttachements, setEmbeddedMessageAttachments] = useState<
        EmbeddedMessageAttachment[]
    >([])

    const onRemoveAttachment = useCallback(
        (attachmentId: string) => {
            setEmbeddedMessageAttachments(
                embeddedMessageAttachements.filter((attachment) => attachment.id !== attachmentId),
            )
        },
        [embeddedMessageAttachements],
    )

    const onMessageLinksUpdated = useCallback((links: EmbeddedMessageAttachment[]) => {
        setEmbeddedMessageAttachments(links)
    }, [])

    const onSendCb = useCallback(
        async (message: string, mentions: Mention[]) => {
            const attachments = files.length > 0 ? (await uploadFiles?.()) ?? [] : []

            attachments.push(...embeddedMessageAttachements)

            const options: SendTextMessageOptions = { messageType: MessageType.Text }
            if (mentions.length > 0) {
                options.mentions = mentions
            }
            if (attachments.length > 0) {
                options.attachments = attachments
            }
            console.log('*** MESSAGE', message)
            onSend?.(message, options)
        },
        [embeddedMessageAttachements, files.length, onSend, uploadFiles],
    )
    const onSendAttemptWhileDisabled = useCallback(() => {
        setIsAttemptingSend(true)
    }, [])

    const showFormattingToolbar = !isTouch
        ? isFormattingToolbarOpen
        : isFormattingToolbarOpen && focused

    const background = isEditing && !isTouch ? 'level1' : 'level2'

    return (
        <>
            <Box position="relative">
                <Box gap grow position="absolute" bottom="none" width="100%">
                    {embeddedMessageAttachements.map((attachment) => (
                        <EmbeddedMessagePreview
                            key={attachment.id}
                            attachment={attachment}
                            onRemove={onRemoveAttachment}
                        />
                    ))}
                </Box>
            </Box>
            <Stack
                background={background}
                rounded={{ default: 'sm', touch: 'none' }}
                borderLeft={!isTouch ? 'default' : 'none'}
                borderRight={!isTouch ? 'default' : 'none'}
                borderTop="default"
                borderBottom={!isTouch ? 'default' : 'none'}
            >
                <LexicalComposer initialConfig={initialConfig}>
                    <Stack horizontal width="100%" paddingRight="sm" alignItems="end">
                        <Box grow width="100%">
                            <CaptureTownsLinkPlugin onUpdate={onMessageLinksUpdated} />
                            <RichTextUI
                                readOnly={!editable}
                                focused={focused || !isEditorEmpty}
                                editing={isEditing}
                                background={background}
                                attemptingToSend={isAttemptingSend}
                                threadId={props.threadId}
                                threadPreview={props.threadPreview}
                                showFormattingToolbar={showFormattingToolbar}
                                canShowInlineToolbar={!isTouch && !showFormattingToolbar}
                                key="editor"
                            >
                                <RichTextPlugin
                                    contentEditable={
                                        <ContentEditable
                                            className={inputClassName}
                                            tabIndex={tabIndex}
                                        />
                                    }
                                    placeholder={<RichTextPlaceholder placeholder={placeholder} />}
                                    ErrorBoundary={LexicalErrorBoundary}
                                />
                            </RichTextUI>
                        </Box>
                        <Box paddingY="sm" paddingRight="xs">
                            <SendMarkdownPlugin
                                displayButtons={props.displayButtons ?? 'on-focus'}
                                disabled={isOffline || !editable}
                                focused={focused}
                                isEditing={isEditing ?? false}
                                isEditorEmpty={isEditorEmpty}
                                setIsEditorEmpty={setIsEditorEmpty}
                                hasImage={fileCount > 0}
                                key="markdownplugin"
                                onSend={onSendCb}
                                onSendAttemptWhileDisabled={onSendAttemptWhileDisabled}
                                onCancel={props.onCancel}
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
                        {protocol === SpaceProtocol.Casablanca && <PasteFilePlugin />}
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
                    <Box grow />

                    <OnFocusPlugin autoFocus={props.autoFocus} onFocusChange={onFocusChange} />
                    <ClearEditorPlugin />
                    <MarkdownShortcutPlugin transformers={transformers} />
                    <HistoryPlugin />
                    <LinkPlugin />
                    <EmojiReplacePlugin />
                    <MentionsPlugin members={members} userId={userId} />
                    <EmojiShortcutPlugin />
                    <ListMaxIndentLevelPlugin maxDepth={4} />
                    <ListPlugin />
                    <CheckListPlugin />
                    {props.autoFocus ? <AutoFocusPlugin /> : <></>}
                    <AutoLinkMatcherPlugin />
                    <ChannelMentionPlugin channels={channels} />
                    <RememberInputPlugin storageId={props.storageId} />
                    <CodeHighlightPlugin />
                    <TabIndentationPlugin />
                </LexicalComposer>
            </Stack>
        </>
    )
})

const RichTextEditorFallbackComponent = (props: { error: Error }) => (
    <Box
        horizontal
        gap="sm"
        rounded="sm"
        background="level3"
        height="x6"
        padding="lg"
        alignItems="center"
        color="gray2"
    >
        <SomethingWentWrong error={props.error} />
    </Box>
)

const CaptureTownsLinkPlugin = (props: {
    onUpdate: (links: EmbeddedMessageAttachment[]) => void
}) => {
    const { onUpdate } = props
    const [editor] = useLexicalComposerContext()
    const [_messageBody, setMessageBody] = useState('')
    const messageBody = useThrottledValue(_messageBody, SECOND_MS)

    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
                const text = $getRoot().getTextContent()
                setMessageBody(text)
            })
        })
    }, [editor])

    const { attachments } = useExtractMessageAttachments({ text: messageBody })

    useEffect(() => {
        onUpdate(attachments)
    }, [attachments, onUpdate])

    return <></>
}
