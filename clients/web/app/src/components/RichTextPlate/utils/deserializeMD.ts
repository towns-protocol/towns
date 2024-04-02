import { Value } from '@udecode/plate-common'
import markdown from 'remark-parse'
import { unified } from 'unified'
import { Channel } from 'use-towns-client'
import remarkSlate from './remark/plugin'
import remarkUserMention from './remark/userMentionPlugin'

/**
 * Deserialize content from Markdown format to Slate format.
 */
export const deserializeMd = <V extends Value>(data: string, channels: Channel[] = []): V => {
    const tree = createUnifiedProcessor(channels).processSync(data)

    return tree.result as V
}

export const createUnifiedProcessor = (channels: Channel[]) =>
    unified().use(markdown).use(remarkSlate).use(remarkUserMention(channels))
