import React, { useCallback } from 'react'
import { TComboboxItemWithData } from '@udecode/plate-combobox'
import { MentionCombobox } from '../../components/plate-ui/MentionCombobox'
import { ComboboxTypes, MOCK_EMOJI, TMentionEmoji } from '../../utils/ComboboxTypes'
import { ELEMENT_MENTION_EMOJI } from './createEmojiPlugin'

const mockEmoji = [
    {
        data: { emoji: MOCK_EMOJI, name: MOCK_EMOJI },
        text: MOCK_EMOJI,
        key: MOCK_EMOJI,
    },
]

export const EmojiPlugin = () => {
    // We don't need to filter the emojis as it is handled in the Combobox component
    const filter = useCallback(
        (query: string) => (item: TComboboxItemWithData<TMentionEmoji>) => true,
        [],
    )

    return (
        <MentionCombobox<TMentionEmoji>
            pluginKey={ELEMENT_MENTION_EMOJI}
            // We need to pass one mock emoji to the Combobox component otherwise it will not render the typeahead menu
            // The rest of the emojis will be fetched asynchronously when the user types
            // This will not be visible to the user
            items={mockEmoji}
            filter={filter}
            id={ComboboxTypes.emojiMention}
        />
    )
}
