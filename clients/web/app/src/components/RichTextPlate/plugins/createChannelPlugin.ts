import { toPlatePlugin } from '@udecode/plate-common/react'
import { createTSlatePlugin } from '@udecode/plate-common'
import { BaseMentionInputPlugin } from '@udecode/plate-mention'
import { withTriggerCombobox } from '@udecode/plate-combobox'

export const ELEMENT_MENTION_CHANNEL = 'mention_channel'

const BaseChannelMentionPlugin = createTSlatePlugin({
    key: ELEMENT_MENTION_CHANNEL,
    extendEditor: withTriggerCombobox,
    node: { isElement: true, isInline: true, isMarkableVoid: true, isVoid: true },
    options: {
        createComboboxInput: (trigger: string) => ({
            children: [{ text: '' }],
            trigger,
            type: BaseMentionInputPlugin.key,
        }),
        trigger: '#',
        insertSpaceAfterMention: true,
        triggerPreviousCharPattern: /^\s?$/,
    },
    plugins: [BaseMentionInputPlugin],
})

export const ChannelMentionPlugin = toPlatePlugin(BaseChannelMentionPlugin)
