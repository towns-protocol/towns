import React, { ClassAttributes, useCallback, useMemo } from 'react'
import { ELEMENT_MENTION } from '@udecode/plate-mention'
import every from 'lodash/every'
import isEqual from 'lodash/isEqual'
import { clsx } from 'clsx'
import { Channel, OTWMention, useUserLookupContext } from 'use-towns-client'
import { Box } from '@ui'
import { MessageStatusAnnotation } from '@components/MessageTimeIineItem/items/MessageItem/MessageStatusAnnotation'
import { getUserIdNameMap } from './components/plate-ui/autocomplete/helpers'
import { getChannelNames, getMentionIds } from './utils/helpers'
import { CodeBlockElement } from './components/plate-ui/CodeBlockElement'
import {
    TChannelMentionElement,
    TUserIDNameMap,
    TUserMentionElement,
} from './components/plate-ui/autocomplete/types'
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

interface RichTextPreviewProps {
    content: string
    statusAnnotation?: MessageStatusAnnotation
    // Contains the list of mentions in the message we're currently previewing.
    // The users may not be in the space any more or their names may have changed
    mentions?: OTWMention[]
    channels?: Channel[]
    onMentionClick?: (mentionName: string) => void
    onMentionHover?: (element?: HTMLElement, userId?: string) => void
    highlightTerms?: string[]
}

const RichTextPreviewInternal = ({
    content,
    statusAnnotation,
    mentions = [],
    channels,
    onMentionClick,
    onMentionHover,
}: RichTextPreviewProps) => {
    const ref = React.useRef<HTMLElement>(null)

    const { lookupUser } = useUserLookupContext()

    const _onMentionHover = useCallback(
        (element?: HTMLElement, userId?: string) => {
            if (!onMentionHover) {
                return
            }
            if (userId && element) {
                onMentionHover(element, userId)
            } else {
                onMentionHover(undefined, undefined)
            }
        },
        [onMentionHover],
    )

    const userIdNameMap: TUserIDNameMap = useMemo(() => {
        return getUserIdNameMap(mentions)
    }, [mentions])

    const isSingleEmoji = useMemo(() => {
        const emojiRegex =
            /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)(?:\u200D(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F?))*$/u

        return content.length < 6 && emojiRegex.test(content)
    }, [content])

    const memoizedComponents = useMemo(
        () => ({
            ul: (props: React.PropsWithChildren<ClassAttributes<HTMLUListElement>>) => (
                <ListElement variant="ul">{props.children}</ListElement>
            ),
            ol: (props: React.PropsWithChildren<ClassAttributes<HTMLOListElement>>) => (
                <ListElement variant="ol" {...props}>
                    {props.children}
                </ListElement>
            ),
            li: (props: React.PropsWithChildren<ClassAttributes<HTMLLIElement>>) => (
                <ListElement variant="li">{props.children}</ListElement>
            ),
            lic: (props: React.PropsWithChildren) => (
                <ListElement variant="span">{props.children}</ListElement>
            ),
            p: ParagraphWithoutPlate,
            paragraph: ParagraphWithoutPlate,
            strong: (props: React.PropsWithChildren) => (
                <Box fontWeight="strong" display="inline" as="span">
                    {props.children}
                </Box>
            ),
            em: (props: React.PropsWithChildren) => (
                <Box fontStyle="italic" display="inline" as="span">
                    {props.children}
                </Box>
            ),
            code: CodeLeaf,
            pre: (props: React.PropsWithChildren) => <CodeBlockElement ref={ref} {...props} />,
            blockquote: BlockquoteElement,
            a: LinkWithoutPlate,
            [ELEMENT_MENTION]: (props: React.PropsWithChildren<{ node: TUserMentionElement }>) => (
                <MentionElementWithoutPlate
                    value={props.node.value}
                    userId={props.node.userId}
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
                color: statusAnnotation === 'not-sent' ? 'error' : undefined,
            })}
        >
            <Box
                as="div"
                className={clsx(fieldClassName, {
                    [singleEmojiMessage]: isSingleEmoji,
                })}
            >
                <MarkdownToJSX
                    // eslint-disable-next-line
                    // @ts-ignore
                    components={memoizedComponents}
                    channels={channels}
                    mentions={userIdNameMap}
                    lookupUser={lookupUser}
                >
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
}

const arePropsEqual = (
    prevProps: RichTextPreviewProps,
    nextProps: RichTextPreviewProps,
): boolean => {
    return every(
        [
            isEqual(prevProps.content, nextProps.content),
            isEqual(prevProps.statusAnnotation, nextProps.statusAnnotation),
            isEqual(getMentionIds(prevProps.mentions), getMentionIds(nextProps.mentions)),
            isEqual(getChannelNames(prevProps.channels), getChannelNames(nextProps.channels)),
            isEqual(prevProps.highlightTerms, nextProps.highlightTerms),
        ],
        true,
    )
}

export const RichTextPreview = React.memo(RichTextPreviewInternal, arePropsEqual)
