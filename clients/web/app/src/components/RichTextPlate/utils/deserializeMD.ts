import { Value } from '@udecode/plate-common'
import { PlateEditor } from '@udecode/plate-core'
import markdown from 'remark-parse'
import { unified } from 'unified'
import remarkSlate from './remark/plugin'
import remarkUserMention from './remark/userMentionPlugin'

/**
 * Deserialize content from Markdown format to Slate format.
 */
export const deserializeMd = <V extends Value>(editor: PlateEditor<V>, data: string): V => {
    const tree = unified().use(markdown).use(remarkSlate).use(remarkUserMention).processSync(data)

    return tree.result as V
}
