import { PlateEditor } from '@udecode/plate-common'
import { plateToMarkdownAsync } from 'slate-mark'
import { Mention } from 'use-zion-client'
import { MyMentionElement, getMentions } from './mentions'

export const toMD = (editor: PlateEditor): Promise<{ message: string; mentions: Mention[] }> => {
    console.log('[INFO] SLATE DATA\n', editor.children)
    return plateToMarkdownAsync(editor.children)
        .then((result) => {
            console.log('[INFO] PLATE -> MD\n', result)
            return { message: result, mentions: getMentions(editor.children as MyMentionElement[]) }
        })
        .catch((err) => {
            console.log('[ERROR] PLATE -> MD', err.message)
            return { message: '', mentions: [] }
        })
}
