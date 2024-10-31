import {
    getBlockAbove,
    getEditorPlugin,
    insertNodes,
    insertText,
    isEndPoint,
    moveSelection,
} from '@udecode/plate-common'
import {
    BaseMentionPlugin,
    type MentionOnSelectItem,
    type TMentionElement,
} from '@udecode/plate-mention'
import {
    TComboboxItemWithData,
    TUserWithChannel,
    TownsMentionConfig,
} from '../components/plate-ui/autocomplete/types'
import { ELEMENT_MENTION_CHANNEL } from './createChannelPlugin'

/**
 * Originally defined in the official PlateJS plugin, `getMentionOnSelectItem` is a function that handles
 * clicking the mention item in the autocomplete dropdown. The original function only returns the text of the
 * selected item, but this function extends it to retrieve the entire item object.
 *
 * @see https://github.com/udecode/plate/blob/main/packages/mention/src/lib/getMentionOnSelectItem.ts
 */
export const getMentionOnSelectItem =
    <TItem extends TComboboxItemWithData = TComboboxItemWithData>({
        key = BaseMentionPlugin.key,
    }: { key?: string } = {}): MentionOnSelectItem<TItem> =>
    (editor, item, search = '') => {
        const { getOptions } = getEditorPlugin<TownsMentionConfig>(editor, {
            key: key as string,
        })
        const { insertSpaceAfterMention } = getOptions()

        switch (key) {
            case BaseMentionPlugin.key:
                insertNodes<TMentionElement>(editor, {
                    type: key,
                    value: '@' + item.text,
                    userId: item.key,
                    atChannel: (item as TComboboxItemWithData<TUserWithChannel>).data.atChannel,
                    children: [{ text: '@' + item.text }],
                })
                break
            case ELEMENT_MENTION_CHANNEL:
                insertNodes<TMentionElement>(editor, {
                    type: key,
                    value: '#' + item.text,
                    channel: item.data,
                    children: [{ text: '#' + item.text }],
                })
                break
            default:
                break
        }
        // move the selection after the element
        moveSelection(editor, { unit: 'offset' })

        const pathAbove = getBlockAbove(editor)?.[1]

        const isBlockEnd =
            editor.selection && pathAbove && isEndPoint(editor, editor.selection.anchor, pathAbove)

        if (isBlockEnd && insertSpaceAfterMention) {
            insertText(editor, ' ')
        }
    }
