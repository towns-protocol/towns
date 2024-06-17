import { createPluginFactory, removeNodes } from '@udecode/plate-common'
import {
    ELEMENT_MENTION_INPUT,
    MentionPlugin,
    isSelectionInMentionInput,
    mentionOnKeyDownHandler,
    withMention,
} from '@udecode/plate-mention'

export const ELEMENT_MENTION_EMOJI = 'mention_emoji'

export const createEmojiPlugin = createPluginFactory<MentionPlugin>({
    key: ELEMENT_MENTION_EMOJI,
    isElement: true,
    isInline: true,
    isVoid: true,
    isMarkableVoid: true,
    handlers: {
        onKeyDown: mentionOnKeyDownHandler({ query: isSelectionInMentionInput }),
        onBlur: (editor) => () => {
            // remove mention_input nodes from editor on blur
            removeNodes(editor, {
                match: (n) => n.type === ELEMENT_MENTION_INPUT,
                at: [],
            })
        },
    },
    withOverrides: withMention,
    options: {
        trigger: ':',
        triggerPreviousCharPattern: /^\s?$/,
        createMentionNode: (item) => ({
            value: item.key,
            emoji: { name: item.text, emoji: item.key },
            children: [{ text: item.key }],
        }),
    },
    plugins: [
        {
            key: ELEMENT_MENTION_INPUT,
            isElement: true,
            isInline: true,
        },
    ],
    then: (editor, { key }) => ({
        options: {
            id: key,
        },
    }),
})
