import React from 'react'
import { ComboboxProps } from '@udecode/plate-combobox'
import { getPluginOptions, useEditorRef } from '@udecode/plate-common'
import { ELEMENT_MENTION, MentionPlugin, getMentionOnSelectItem } from '@udecode/plate-mention'
import { Channel, RoomMember } from 'use-zion-client'
import { Combobox } from './Combobox'

export const MentionCombobox = <T extends RoomMember | Channel>({
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
