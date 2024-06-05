import { PlateEditor } from '@udecode/plate-common'
import { Mention } from 'use-towns-client'
import { TUserMentionElement } from './ComboboxTypes'
import { serialize } from './remark'
import { getMentions } from './mentions'

export const toMD = (editor: PlateEditor): Promise<{ message: string; mentions: Mention[] }> => {
    return new Promise((resolve, reject) => {
        queueMicrotask(() => {
            try {
                const markdown = editor.children
                    .map((child) => serialize(child))
                    .join('\n')
                    .trim()
                resolve({
                    message: markdown,
                    mentions: getMentions(editor.children as TUserMentionElement[]),
                })
            } catch (err) {
                console.log('[ERROR] Plate -> MD', err)
                reject({ message: '', mentions: [] })
            }
        })
    })
}
