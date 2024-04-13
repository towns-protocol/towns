import React, { useCallback, useMemo } from 'react'
import { ELEMENT_MENTION, TMentionElement } from '@udecode/plate-mention'
import { clsx } from 'clsx'
import { Channel, RoomMember } from 'use-towns-client'
import { CodeBlockElement } from '@components/RichTextPlate/components/plate-ui/CodeBlockElement'
import { MessageStatusAnnotation } from '@components/RichText/hooks/useInitialConfig'
import { Box, Text } from '@ui'
import { TChannelMentionElement } from './utils/ComboboxTypes'
import { ELEMENT_MENTION_CHANNEL } from './plugins/createChannelPlugin'
import { MentionElementWithoutPlate } from './components/plate-ui/MentionElement'
import { ChannelLinkForDisplay } from './components/ChannelLink'
import * as fieldStyles from '../../ui/components/_internal/Field/Field.css'
import { atoms } from '../../ui/styles/atoms.css'
import { BlockquoteElement } from './components/plate-ui/BlockquoteElement'
import { CodeLeaf } from './components/plate-ui/CodeLeaf'
import { LinkWithoutPlate } from './components/plate-ui/LinkElement'
import { ListElement } from './components/plate-ui/ListElement'
import { ParagraphWithoutPlate } from './components/plate-ui/ParagraphElement'
import { edited, richText, singleEmojiMessage } from './RichTextEditor.css'
import MarkdownToJSX from './utils/MarkdownToJSX'

const fieldClassName = clsx([fieldStyles.field, richText])

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
        const { content, statusAnnotation, members, channels, onMentionClick, onMentionHover } =
            props
        const ref = React.useRef<HTMLElement>(null)
        const _onMentionHover = useCallback(
            (element?: HTMLElement, username?: string) => {
                if (!onMentionHover) {
                    return
                }
                if (username && element) {
                    const member = members?.find((m) => m.username === username)
                    onMentionHover(element, member?.userId)
                } else {
                    onMentionHover(undefined, undefined)
                }
            },
            [members, onMentionHover],
        )

        const isSingleEmoji = useMemo(() => {
            //  https://stackoverflow.com/a/72727900/64223
            return (
                content.length < 12 &&
                /^(\p{Emoji}\uFE0F|\p{Emoji_Presentation}|\s)+$/u.test(content)
            )
        }, [content])

        const memoizedComponents = useMemo(
            () => ({
                ul: (props: React.PropsWithChildren) => (
                    <ListElement variant="ul">{props.children}</ListElement>
                ),
                ol: (props: React.PropsWithChildren) => (
                    <ListElement variant="ol">{props.children}</ListElement>
                ),
                li: (props: React.PropsWithChildren) => (
                    <ListElement variant="li">{props.children}</ListElement>
                ),
                lic: (props: React.PropsWithChildren) => (
                    <ListElement variant="span">{props.children}</ListElement>
                ),
                p: ParagraphWithoutPlate,
                paragraph: ParagraphWithoutPlate,
                strong: (props: React.PropsWithChildren) => (
                    <Text strong display="inline" as="span">
                        {props.children}
                    </Text>
                ),
                em: (props: React.PropsWithChildren) => (
                    <Text display="inline" as="span" style={{ fontStyle: 'italic' }}>
                        {props.children}
                    </Text>
                ),
                code: CodeLeaf,
                pre: (props: React.PropsWithChildren) => <CodeBlockElement ref={ref} {...props} />,
                blockquote: BlockquoteElement,
                a: LinkWithoutPlate,
                [ELEMENT_MENTION]: (props: React.PropsWithChildren<{ node: TMentionElement }>) => (
                    <MentionElementWithoutPlate
                        value={props.node.value}
                        onMentionHover={_onMentionHover}
                        onMentionClick={onMentionClick}
                    />
                ),
                [ELEMENT_MENTION_CHANNEL]: (
                    props: React.PropsWithChildren<{ node: TChannelMentionElement }>,
                ) => <ChannelLinkForDisplay channels={channels} channelLabel={props.node.value} />,
            }),
            [_onMentionHover, onMentionClick, channels],
        )

        return (
            // this extra <div> prevents the preview from starting up too big,
            // ...yet to find out why this occurs
            <div
                className={atoms({
                    color: props.statusAnnotation === 'not-sent' ? 'error' : undefined,
                })}
            >
                <Box
                    as="div"
                    className={clsx(fieldClassName, {
                        [singleEmojiMessage]: isSingleEmoji,
                    })}
                >
                    <MarkdownToJSX components={memoizedComponents} channels={channels}>
                        {content}
                    </MarkdownToJSX>
                    {statusAnnotation === 'edited' && (
                        <Box as="span" color="gray2" fontSize="sm" className={edited}>
                            (edited)
                        </Box>
                    )}
                </Box>
            </div>
        )
    },
)
