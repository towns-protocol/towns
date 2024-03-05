import React from 'react'
import { ComboboxProps } from '@udecode/plate-combobox'
import { getPluginOptions, useEditorRef } from '@udecode/plate-common'
import { ELEMENT_MENTION, MentionPlugin, getMentionOnSelectItem } from '@udecode/plate-mention'
import { Combobox } from './Combobox'
import { TMentionComboboxTypes } from '../../utils/ComboboxTypes'

export const MentionCombobox = <T extends TMentionComboboxTypes>({
    pluginKey = ELEMENT_MENTION,
    id = pluginKey,
    ...props
}: Partial<ComboboxProps<T>> & {
    pluginKey?: string
}) => {
    const editor = useEditorRef()

    const { trigger } = getPluginOptions<MentionPlugin>(editor, pluginKey)

    return (
        <div onMouseDown={(e) => e.preventDefault()}>
            <Combobox<T>
                controlled
                id={id}
                trigger={trigger!}
                onSelectItem={getMentionOnSelectItem({
                    key: pluginKey,
                })}
                {...props}
            />
        </div>
    )
}
