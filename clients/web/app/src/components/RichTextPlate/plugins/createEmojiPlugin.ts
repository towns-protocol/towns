import { createPluginFactory } from '@udecode/plate-common'
import { ELEMENT_MENTION_INPUT, MentionPlugin } from '@udecode/plate-mention'
import { withTriggerCombobox } from '@udecode/plate-combobox'
import { Channel } from 'use-towns-client'
import { TComboboxItemWithData } from '../components/plate-ui/autocomplete/types'

export const ELEMENT_MENTION_EMOJI = 'mention_emoji'

/**
 * Enables support for autocompleting :emoji in rich text editor.
 */
export const createEmojiPlugin = createPluginFactory<MentionPlugin<TComboboxItemWithData<Channel>>>(
    {
        key: ELEMENT_MENTION_EMOJI,
        isElement: true,
        isInline: true,
        isMarkableVoid: true,
        isVoid: true,
        options: {
            createComboboxInput: (trigger) => ({
                children: [{ text: '' }],
                trigger,
                type: ELEMENT_MENTION_INPUT,
            }),
            createMentionNode: (item) => ({
                value: item.key,
                emoji: { name: item.text, emoji: item.key },
                children: [{ text: '' }],
            }),
            insertSpaceAfterMention: true,
            trigger: ':',
            triggerPreviousCharPattern: /^\s?$/,
        },
        plugins: [
            {
                isElement: true,
                isInline: true,
                isVoid: true,
                key: ELEMENT_MENTION_INPUT,
            },
        ],
        withOverrides: withTriggerCombobox,
    },
)
