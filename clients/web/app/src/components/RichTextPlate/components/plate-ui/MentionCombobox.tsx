import React from 'react'
import { ComboboxProps, comboboxSelectors } from '@udecode/plate-combobox'
import {
    TRange,
    getPluginOptions,
    getPreviousSiblingNode,
    isCollapsed,
    select,
    useEditorRef,
} from '@udecode/plate-common'
import { ELEMENT_MENTION, MentionPlugin, getMentionOnSelectItem } from '@udecode/plate-mention'
import cloneDeep from 'lodash/cloneDeep'
import { ComboboxMemoized as Combobox } from './Combobox'
import { TMentionComboboxTypes } from '../../utils/ComboboxTypes'

/**
 * When user tries to add a mention node at the beginning of sentence, preceding some text which already exists, Plate JS
 * would throw an error. This function is a fix for that issue.
 *
 * It checks if the target range is collapsed and if the current selection is at [0, 0, 0], which is not a valid
 * position to insert a mention node. If it is, we move the selection to [0, 1, 0], add the mention node and finally
 * inserts a space character
 * */
const onSelectedItemWithRangeFix =
    (key: string): ComboboxProps<TMentionComboboxTypes>['onSelectItem'] =>
    (editor, item) => {
        const { targetRange }: { targetRange: TRange | null } = comboboxSelectors.state()
        if (!targetRange) {
            return
        }
        if (
            isCollapsed(targetRange) &&
            getPreviousSiblingNode(
                editor,
                targetRange.focus.path.slice(0, targetRange.focus.path.length - 1),
            ) === undefined
        ) {
            const newRange = cloneDeep(targetRange)
            newRange.focus.path[1] = 1
            newRange.anchor.path[1] = 1
            select(editor, newRange)
            getMentionOnSelectItem({ key })(editor, item)
            editor.insertText(' ')
        } else {
            getMentionOnSelectItem({ key })(editor, item)
        }
    }

export const MentionCombobox = <T extends TMentionComboboxTypes>({
    pluginKey = ELEMENT_MENTION,
    id = pluginKey,
    currentUser,
    ...props
}: Partial<ComboboxProps<T>> & {
    pluginKey?: string
    currentUser?: string
}) => {
    const editor = useEditorRef()

    const { trigger } = getPluginOptions<MentionPlugin>(editor, pluginKey)

    return (
        <div onMouseDown={(e) => e.preventDefault()}>
            <Combobox<T>
                controlled
                id={id}
                trigger={trigger!}
                currentUser={currentUser}
                onSelectItem={onSelectedItemWithRangeFix(pluginKey)}
                {...props}
            />
        </div>
    )
}
