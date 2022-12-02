import { CodeNode } from '@lexical/code'
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
import {
    Channel,
    Mention,
    RoomMember,
    SendTextMessageOptions,
    useSpaceMembers,
} from 'use-zion-client'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import * as fieldStyles from 'ui/components/_internal/Field/Field.css'
import { notUndefined } from 'ui/utils/utils'
import { useStore } from 'store/store'
import { useInitialConfig } from './hooks/useInitialConfig'
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
import { NewMentionsPlugin } from './plugins/MentionsPlugin'
import { OnFocusPlugin } from './plugins/OnFocusPlugin'
import { SendMarkdownPlugin } from './plugins/SendMarkdownPlugin'
import * as styles from './RichTextEditor.css'
import { RichTextPlaceholder } from './ui/Placeholder/RichTextEditorPlaceholder'
import { RichTextUI } from './ui/RichTextEditorUI'
import { BLANK_LINK } from './transformers/LinkTransformer'
import { TabThroughPlugin } from './plugins/TabThroughPlugin'
import { RememberInputPlugin } from './plugins/RememberInputPlugin'

type Props = {
    onSend?: (value: string, options: SendTextMessageOptions | undefined) => void
    onCancel?: () => void
    autoFocus?: boolean
    editable: boolean
    editing?: boolean
    placeholder?: string
    initialValue?: string
    displayButtons?: boolean
    container?: (props: { children: React.ReactNode }) => JSX.Element
    tabIndex?: number
    storageId?: string
}

const fieldClassName = clsx([fieldStyles.field, styles.richText])
const inputClassName = clsx([fieldStyles.field, styles.richText, styles.contentEditable])

const nodes = [
    CodeNode,
    HeadingNode,
    AnnotationNode,
    EmojiNode,
    AutoLinkNode,
    LinkNode,
    ListItemNode,
    ListNode,
    MentionNode,
    ChannelMentionNode,
    ChannelLinkNode,
    QuoteNode,
]
interface IUseTransformers {
    members: RoomMember[]
    channels: Channel[]
}

// either we filter out, or selectively import if this filter list gets too large
const filteredDefaultTransforms = TRANSFORMERS.filter((t) => !isEqual(t, HEADING))
    // map all links to custom, with target="_blank"
    .map((t) => (isEqual(t, LINK) ? BLANK_LINK : t))

const useTransformers = ({ members, channels }: IUseTransformers) => {
    const transformers = useMemo(() => {
        const names = members
            .filter((m) => notUndefined(m.name))
            .map((m) => ({ displayName: m.name, userId: m.userId }))
        const channelHashtags = channels.filter(notUndefined)
        return [
            CHECK_LIST,
            ...filteredDefaultTransforms,
            createMentionTransformer(names),
            createChannelLinkTransformer(channelHashtags),
        ]
    }, [members, channels])
    return { transformers }
}

export const RichTextPreview = React.memo(
    (props: {
        content: string
        edited?: boolean
        members?: RoomMember[]
        channels?: Channel[]
    }) => {
        const { channels = [], members = [] } = props
        // note: unnecessary repetition here, could be optimised by handling above
        // inside e.g. space context or timeline

        const { transformers } = useTransformers({ members, channels })

        const initialConfig = useInitialConfig(
            props.content,
            nodes,
            transformers,
            false,
            props.edited,
        )

        return (
            <LexicalComposer initialConfig={initialConfig}>
                <RichTextPlugin
                    ErrorBoundary={LexicalErrorBoundary}
                    contentEditable={<ContentEditable className={fieldClassName} />}
                    placeholder=""
                />
            </LexicalComposer>
        )
    },
)

export const RichTextPreviewPlain = React.memo((props: { content: string; edited?: boolean }) => {
    // note: unnecessary repetition here, could be optimised by handling above
    // inside e.g. space context or timeline

    const initialConfig = useInitialConfig(props.content, nodes, [], false, props.edited)

    return (
        <LexicalComposer initialConfig={initialConfig}>
            <RichTextPlugin
                contentEditable={<ContentEditable className={fieldClassName} />}
                placeholder=""
                ErrorBoundary={LexicalErrorBoundary}
            />
        </LexicalComposer>
    )
})

export const RichTextEditor = (props: Props) => {
    const { placeholder = 'Write something ...', editing: isEditing, onSend, tabIndex } = props

    const { members } = useSpaceMembers()
    const channels = useSpaceChannels()
    const { transformers } = useTransformers({ members, channels })

    const userInput = useStore((state) =>
        props.storageId ? state.channelMessageInputMap[props.storageId] : undefined,
    )

    const valueFromStore = props.storageId ? userInput : undefined

    const initialConfig = useInitialConfig(
        props.initialValue || valueFromStore,
        nodes,
        transformers,
        true,
    )

    const [focused, setFocused] = useState(false)
    const onFocusChange = (focus: boolean) => {
        setFocused(focus)
    }
    const onSendCb = useCallback(
        (message: string, mentions: Mention[]) => {
            const options = mentions.length > 0 ? { mentions } : undefined
            onSend?.(message, options)
        },
        [onSend],
    )

    return (
        <LexicalComposer initialConfig={initialConfig}>
            <RichTextUI focused={focused} editing={isEditing}>
                <RichTextPlugin
                    contentEditable={
                        <ContentEditable className={inputClassName} tabIndex={tabIndex} />
                    }
                    placeholder={<RichTextPlaceholder placeholder={placeholder} />}
                    ErrorBoundary={LexicalErrorBoundary}
                />
            </RichTextUI>
            <OnFocusPlugin autoFocus={props.autoFocus} onFocusChange={onFocusChange} />
            <ClearEditorPlugin />
            <MarkdownShortcutPlugin transformers={transformers} />
            <HistoryPlugin />
            <LinkPlugin />
            <EmojiReplacePlugin />
            <NewMentionsPlugin members={members} />
            <EmojiShortcutPlugin />
            <ListMaxIndentLevelPlugin maxDepth={4} />
            <ListPlugin />
            <CheckListPlugin />
            <SendMarkdownPlugin
                displayButtons={props.displayButtons}
                onSend={onSendCb}
                onCancel={props.onCancel}
            />
            <AutoFocusPlugin />
            <AutoLinkMatcherPlugin />
            <ChannelMentionPlugin channels={channels} />
            <TabThroughPlugin />
            <RememberInputPlugin storageId={props.storageId} />
        </LexicalComposer>
    )
}
