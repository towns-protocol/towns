import React from 'react'
import { clsx } from 'clsx'
import { Channel, RoomMember } from 'use-zion-client'
import { LinkNode } from '@lexical/link'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary'
import { NodeEventPlugin } from '@lexical/react/LexicalNodeEventPlugin'
import {
    MessageStatusAnnotation,
    useInitialConfig,
} from '@components/RichText/hooks/useInitialConfig'
import * as fieldStyles from 'ui/components/_internal/Field/Field.css'
import { atoms } from '../../ui/styles/atoms.css'
import CodeHighlightPlugin from './plugins/CodeHighlightPlugin'
import { MentionClickPlugin } from './plugins/MentionClickPlugin'
import { MentionHoverPlugin } from './plugins/MentionHoverPlugin'
import * as styles from './RichTextEditor.css'
import { singleEmojiMessage } from './RichTextEditor.css'
import { useTransformers } from './transformers/useTransformers'
import { nodeTypeList } from './nodes/nodeList'

const fieldClassName = clsx([fieldStyles.field, styles.richText])
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
            nodeTypeList,
            transformers,
            false,
            statusAnnotation,
        )

        const isSingleEmoji = React.useMemo(() => {
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
