import { createPluginFactory, removeNodes } from '@udecode/plate-common'
import {
    ELEMENT_MENTION_INPUT,
    MentionPlugin,
    isSelectionInMentionInput,
    mentionOnKeyDownHandler,
    withMention,
} from '@udecode/plate-mention'

export const ELEMENT_MENTION_CHANNEL = 'mention_channel'

/**
 * Enables support for autocompleting @mentions.
 */
export const createChannelPlugin = createPluginFactory<MentionPlugin>({
    key: ELEMENT_MENTION_CHANNEL,
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
        trigger: '#',
        triggerPreviousCharPattern: /^\s?$/,
        createMentionNode: (item) => ({ value: item.text }),
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
