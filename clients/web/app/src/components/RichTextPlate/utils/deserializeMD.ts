import { Value } from '@udecode/plate-common'
import markdown from 'remark-parse'
import remarkGfm from 'remark-gfm'
import { unified } from 'unified'
import { Channel, OTWMention, useUserLookupContext } from 'use-towns-client'
import remarkDecodeHTMLCodeBlocks from './remark/remarkDecodeHTMLCodeBlocks'
import remarkSlate from './remark/plugin'
import remarkTransformUserAndChannels from './remark/remarkTransformUserAndChannels'
import remarkRemoveHeadings from './remark/remarkRemoveHeadings'

/**
 * Deserialize content from Markdown format to Slate format.
 * This function is only used during edit and restore draft message from local storage.
 *
 * For displaying message content in timeline, use `MarkdownToJSX` component instead.
 *
 * @see MarkdownToJSX
 */
export const deserializeMd = <V extends Value>(
    data: string,
    channels: Channel[] = [],
    mentions: OTWMention[] = [],
    lookupUser?: ReturnType<typeof useUserLookupContext>['lookupUser'],
): V => {
    const tree = unified()
        .use(markdown)
        .use(remarkGfm)
        .use(remarkRemoveHeadings)
        .use(remarkDecodeHTMLCodeBlocks)
        .use(remarkSlate)
        .use(remarkTransformUserAndChannels(channels, mentions, lookupUser))
        .processSync(data)

    return tree.result as V
}
