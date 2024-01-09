import { CodeHighlightNode, CodeNode } from '@lexical/code'
import { AutoLinkNode, LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { CHECK_LIST, HEADING, LINK, TRANSFORMERS } from '@lexical/markdown'
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
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary'
import { clsx } from 'clsx'
import isEqual from 'lodash/isEqual'
import React, { useCallback, useMemo, useState } from 'react'
import { Channel, Mention, MessageType, RoomMember, SendTextMessageOptions } from 'use-zion-client'
import { NodeEventPlugin } from '@lexical/react/LexicalNodeEventPlugin'
import { ErrorBoundary } from '@components/ErrorBoundary/ErrorBoundary'
import * as fieldStyles from 'ui/components/_internal/Field/Field.css'
import { notUndefined } from 'ui/utils/utils'
import { useInputStore } from 'store/store'
import { Box, BoxProps, Stack } from '@ui'
import { useNetworkStatus } from 'hooks/useNetworkStatus'
import { SomethingWentWrong } from '@components/Errors/SomethingWentWrong'
import { atoms } from 'ui/styles/atoms.css'
import { useDevice } from 'hooks/useDevice'
import { SpaceProtocol, useEnvironment } from 'hooks/useEnvironmnet'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { useMediaDropContext } from '@components/MediaDropContext/MediaDropContext'
import { MessageStatusAnnotation, useInitialConfig } from './hooks/useInitialConfig'
import { AnnotationNode } from './nodes/AnnotationNode'
import { ChannelLinkNode, createChannelLinkTransformer } from './nodes/ChannelLinkNode'
import { ChannelMentionNode } from './nodes/ChannelMentionNode'
import { EmojiNode } from './nodes/EmojiNode'
import { MentionNode, createMentionTransformer } from './nodes/MentionNode'
import { AutoLinkMatcherPlugin } from './plugins/AutoLinkMatcherPlugin'
import { ChannelMentionPlugin } from './plugins/ChannelMentionPlugin'
import { EmojiReplacePlugin } from './plugins/EmojiReplacePlugin'
import { EmojiShortcutPlugin } from './plugins/EmojiShortcutPlugin'
import ListMaxIndentLevelPlugin from './plugins/ListMaxIndentLevelPlugin'
import { MentionClickPlugin } from './plugins/MentionClickPlugin'
import { MentionsPlugin } from './plugins/MentionsPlugin'
import { OnFocusPlugin } from './plugins/OnFocusPlugin'
import { SendMarkdownPlugin } from './plugins/SendMarkdownPlugin'
import * as styles from './RichTextEditor.css'
import { RichTextPlaceholder } from './ui/Placeholder/RichTextEditorPlaceholder'
import { RichTextUI, RichTextUIContainer } from './ui/RichTextEditorUI'
import { BLANK_LINK } from './transformers/LinkTransformer'
import { RememberInputPlugin } from './plugins/RememberInputPlugin'
import CodeHighlightPlugin from './plugins/CodeHighlightPlugin'
import { TabIndentationPlugin } from './plugins/TabIndentationPlugin'
import { MentionHoverPlugin } from './plugins/MentionHoverPlugin'
import { RichTextBottomToolbar } from './RichTextBottomToolbar'
import { singleEmojiMessage } from './RichTextEditor.css'
import { PasteFilePlugin } from './plugins/PasteFilePlugin'
import { HightlightNode, createHighlightTransformer } from './nodes/HightlightNode'

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

const fieldClassName = clsx([fieldStyles.field, styles.richText])
const inputClassName = clsx([fieldStyles.field, styles.richText, styles.contentEditable])

const nodes = [
    CodeNode,
    CodeHighlightNode,
    HeadingNode,
    AnnotationNode,
    EmojiNode,
    AutoLinkNode,
    LinkNode,
    ListItemNode,
    ListNode,
    MentionNode,
    HightlightNode,
    ChannelMentionNode,
    ChannelLinkNode,
    QuoteNode,
]
interface IUseTransformers {
    members: RoomMember[]
    channels: Channel[]
    highlightTerms?: string[]
}

// either we filter out, or selectively import if this filter list gets too large
const filteredDefaultTransforms = TRANSFORMERS.filter((t) => !isEqual(t, HEADING))
    // map all links to custom, with target="_blank"
    .map((t) => (isEqual(t, LINK) ? BLANK_LINK : t))

const useTransformers = ({ members, channels, highlightTerms }: IUseTransformers) => {
    const filteredChannels = channels.filter((c) => notUndefined(c) && c.label.length > 1)
    const transformers = useMemo(() => {
        const names = members
            .filter((m) => notUndefined(m.displayName))
            .map((m) => ({ displayName: getPrettyDisplayName(m), userId: m.userId }))

        return [
            createMentionTransformer(names),
            filteredChannels.length ? createChannelLinkTransformer(filteredChannels) : undefined,
            CHECK_LIST,
            ...filteredDefaultTransforms,
            ...(highlightTerms?.length ? [createHighlightTransformer(highlightTerms)] : []),
        ].filter(notUndefined)
    }, [filteredChannels, highlightTerms, members])
    return { transformers }
}

export const RichTextPreview = React.memo(
    (props: {
        content: string
        statusAnnotation?: MessageStatusAnnotation
        members?: RoomMember[]
        channels?: Channel[]
        onMentionClick?: (mentionName: string) => void
        onMentionHover?: (element?: HTMLElement, userId?: string) => void
        highlightTerms?: string[]
    }) => {
        const {
            content,
            statusAnnotation,
            onMentionClick,
            onMentionHover,
            channels = [],
            members = [],
            highlightTerms,
        } = props

        // note: unnecessary repetition here, could be optimised by handling above
        // inside e.g. space context or timeline

        const { transformers } = useTransformers({ members, channels, highlightTerms })

        const initialConfig = useInitialConfig(
            props.content,
            nodes,
            transformers,
            false,
            statusAnnotation,
        )

        const isSingleEmoji = useMemo(() => {
            //  https://stackoverflow.com/a/72727900/64223
            return (
                content.length < 12 &&
                /^(\p{Emoji}\uFE0F|\p{Emoji_Presentation}|\s)+$/u.test(content)
            )
        }, [content])

        return (
            // this extra <div> prevents the preview from starting up too big,
            // ...yet to find out why this occurs
            <div
                className={atoms({
                    color: props.statusAnnotation === 'not-sent' ? 'error' : undefined,
                })}
            >
                <LexicalComposer initialConfig={initialConfig} key={statusAnnotation}>
                    {onMentionClick ? (
                        <MentionClickPlugin onMentionClick={onMentionClick} />
                    ) : (
                        <></>
                    )}
                    {onMentionHover ? (
                        <MentionHoverPlugin onMentionHover={onMentionHover} />
                    ) : (
                        <> </>
                    )}
                    <RichTextPlugin
                        ErrorBoundary={LexicalErrorBoundary}
                        contentEditable={
                            <ContentEditable
                                className={clsx(fieldClassName, {
                                    [singleEmojiMessage]: isSingleEmoji,
                                })}
                            />
                        }
                        placeholder={<div />}
                    />
                    <CodeHighlightPlugin />
                    <NodeEventPlugin
                        nodeType={LinkNode}
                        eventType="click"
                        eventListener={(e: Event) => {
                            e.stopPropagation()
                        }}
                    />
                </LexicalComposer>
            </div>
        )
    },
)

export const RichTextPreviewPlain = React.memo(
    (props: { content: string; annotation?: MessageStatusAnnotation }) => {
        // note: unnecessary repetition here, could be optimised by handling above
        // inside e.g. space context or timeline

        const initialConfig = useInitialConfig(undefined, nodes, [], false, props.annotation)
        return (
            <LexicalComposer initialConfig={initialConfig}>
                <RichTextPlugin
                    contentEditable={<ContentEditable className={fieldClassName} />}
                    placeholder={<div />}
                    ErrorBoundary={LexicalErrorBoundary}
                />
            </LexicalComposer>
        )
    },
)

export const RichTextEditor = (props: Props) => {
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
        isFullWidthOnTouch,
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
        nodes,
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

    const onSendCb = useCallback(
        async (message: string, mentions: Mention[]) => {
            const attachments = files.length > 0 ? (await uploadFiles?.()) ?? [] : []

            const options: SendTextMessageOptions = { messageType: MessageType.Text }
            if (mentions.length > 0) {
                options.mentions = mentions
            }
            if (attachments.length > 0) {
                options.attachments = attachments
            }
            onSend?.(message, options)
        },
        [onSend, files, uploadFiles],
    )
    const onSendAttemptWhileDisabled = useCallback(() => {
        setIsAttemptingSend(true)
    }, [])

    if (!editable) {
        return (
            <RichTextUIContainer
                rounded={{ default: 'sm', touch: isFullWidthOnTouch ? 'none' : 'sm' }}
            >
                <RichTextPlaceholder placeholder={placeholder} color="level4" />
            </RichTextUIContainer>
        )
    }

    const showFormattingToolbar = !isTouch
        ? isFormattingToolbarOpen
        : isFormattingToolbarOpen && focused

    const background = isEditing && !isTouch ? 'level1' : 'level2'

    return (
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
                        <RichTextUI
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
                            disabled={isOffline}
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

                <Stack gap shrink paddingX paddingBottom="sm">
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
