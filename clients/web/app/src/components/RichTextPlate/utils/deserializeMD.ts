import { Value } from '@udecode/plate-common'
import markdown from 'remark-parse'
import remarkGfm from 'remark-gfm'
import { unified } from 'unified'
import { Channel } from 'use-towns-client'
import remarkSlate from './remark/plugin'
import remarkUserMention from './remark/userMentionPlugin'

/**
 * Deserialize content from Markdown format to Slate format.
 * This function is only used during edit and restore draft message from local storage.
 *
 * For displaying message content in timeline, use `MarkdownToJSX` component instead.
 *
 * @see MarkdownToJSX
 */
export const deserializeMd = <V extends Value>(data: string, channels: Channel[] = []): V => {
    const tree = createUnifiedProcessor(channels).processSync(data)

    return tree.result as V
}

export const createUnifiedProcessor = (channels: Channel[]) =>
    unified().use(markdown).use(remarkGfm).use(remarkSlate).use(remarkUserMention(channels))
