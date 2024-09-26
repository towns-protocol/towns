import { PlateEditor } from '@udecode/plate-common'
import { Mention } from 'use-towns-client'
import { TUserMentionElement } from '../components/plate-ui/autocomplete/types'
import { serialize } from './remark'
import { getMentions } from '../components/plate-ui/autocomplete/helpers'

export const toMD = (editor: PlateEditor): Promise<{ message: string; mentions: Mention[] }> => {
    return new Promise((resolve, reject) => {
        queueMicrotask(() => {
            try {
                const markdown = editor.children
                    .map((child) => serialize(child))
                    .join('\n')
                    .trim()
                    /**
                     * After trimming, 4 new lines are considered a new paragraph, which need to be
                     * replaced with 2 new lines + non-breaking space + 2 new lines to preserve the paragraph spacing
                     */
                    .replace(/\n{4,}/g, '\n\n&nbsp;\n\n')
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
