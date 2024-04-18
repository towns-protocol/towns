import React from 'react'
import { Components, toJsxRuntime } from 'hast-util-to-jsx-runtime'
// @ts-expect-error: untyped.
import { Fragment, jsx, jsxs } from 'react/jsx-runtime'
import { VFile } from 'vfile'
import { ELEMENT_LIC } from '@udecode/plate-list'
import { ELEMENT_MENTION } from '@udecode/plate-mention'
import remarkRehype, { Options } from 'remark-rehype'
import { Channel, OTWMention, RoomMember } from 'use-towns-client'
import markdown from 'remark-parse'
import remarkGfm from 'remark-gfm'
import { unified } from 'unified'
import { ELEMENT_MENTION_CHANNEL } from '../plugins/createChannelPlugin'
import { channelMentionHandler, listContentHandler, userMentionHandler } from './rehypeHandlers'
import remarkTransformUserAndChannels from './remark/remarkTransformUserAndChannels'
import remarkPreserveListContent from './remark/remarkPreserveListContent'

type MarkdownRendererProps = React.PropsWithChildren<{
    components: Partial<Components>
    channels?: Channel[]
    mentions?: OTWMention[]
    users?: RoomMember[]
}>

/**
 * Deserialize content from Markdown format to JSX.
 * This function is only used for displaying message content in timeline,
 *
 * For edit message, use `deserializeMd` function instead.
 * @see deserializeMd
 */
const MarkdownRenderer = ({
    components,
    channels = [],
    mentions = [],
    users = [],
    children,
}: MarkdownRendererProps) => {
    if (!children) {
        return null
    }

    const file = new VFile()
    const unifiedPipeline = unified()
        .use(markdown)
        .use(remarkGfm)
        .use(remarkPreserveListContent)
        .use(remarkTransformUserAndChannels(channels, mentions, users))
        .use(remarkRehype, {
            passThrough: [ELEMENT_LIC, ELEMENT_MENTION, ELEMENT_MENTION_CHANNEL],
            handlers: {
                [ELEMENT_MENTION]: userMentionHandler,
                [ELEMENT_MENTION_CHANNEL]: channelMentionHandler,
                [ELEMENT_LIC]: listContentHandler,
            },
        } as unknown as Options)

    if (typeof children === 'string') {
        file.value = children
    } else {
        throw new Error('Expected `children` to be a string')
    }

    const mdastTree = unifiedPipeline.parse(file)
    const hastTree = unifiedPipeline.runSync(mdastTree, file)

    return toJsxRuntime(hastTree, {
        development: true,
        Fragment,
        components,
        ignoreInvalidStyle: true,
        jsx,
        jsxs,
        jsxDEV: jsx,
        passKeys: true,
        passNode: true,
    })
}

const getChannelNames = (channels?: Channel[]): string =>
    (channels || []).map((c) => c.label).join('')

/**
 * Compare props to determine if the component should re-render.
 * Given that a lot of transformation is happening here, we want to be
 * as conservative as possible before re-rendering
 *
 * Unless the MD content or channel list has changed, we don't want to re-render
 */
const arePropsEqual = (
    prevProps: MarkdownRendererProps,
    nextProps: MarkdownRendererProps,
): boolean => {
    if (prevProps.children !== nextProps.children) {
        return false
    }

    return getChannelNames(prevProps.channels) === getChannelNames(nextProps.channels)
}

/**
 * @see MarkdownRenderer
 */
const MarkdownToJSX = React.memo(MarkdownRenderer, arePropsEqual)

export default MarkdownToJSX
