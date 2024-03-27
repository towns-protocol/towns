import React, { useCallback } from 'react'
import { TComboboxItemWithData } from '@udecode/plate-combobox'
import { MOCK_EMOJI } from '../../components/plate-ui/Combobox'
import { MentionCombobox } from '../../components/plate-ui/MentionCombobox'
import { TMentionEmoji } from '../../utils/ComboboxTypes'
import { ELEMENT_MENTION_EMOJI } from './createEmojiPlugin'

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
            items={[
                {
                    data: { emoji: MOCK_EMOJI, name: MOCK_EMOJI },
                    text: MOCK_EMOJI,
                    key: MOCK_EMOJI,
                },
            ]}
            filter={filter}
            id="emojis"
        />
    )
}
