import { PlateEditor } from '@udecode/plate-common'
import { plateToMarkdownAsync } from 'slate-mark'
import { Mention } from 'use-towns-client'
import { MyMentionElement, getMentions } from './mentions'

export const toMD = (editor: PlateEditor): Promise<{ message: string; mentions: Mention[] }> => {
    return plateToMarkdownAsync(editor.children)
        .then((result) => {
            return { message: result, mentions: getMentions(editor.children as MyMentionElement[]) }
        })
        .catch((err) => {
            console.log('[ERROR] PLATE -> MD', err.message)
            return { message: '', mentions: [] }
        })
}
