import React, { useEffect, useState } from 'react'
import { TComboboxItemWithData, useComboboxSelectors } from '@udecode/plate-combobox'
import { search } from '@components/RichText/plugins/EmojiShortcutPlugin'
import { MentionCombobox } from '../../components/plate-ui/MentionCombobox'
import { TMentionEmoji } from '../../utils/ComboboxTypes'
import { ELEMENT_MENTION_EMOJI } from './createEmojiPlugin'

export const EmojiPlugin = () => {
    const [results, setResults] = useState<TComboboxItemWithData<TMentionEmoji>[]>([])

    const query = useComboboxSelectors.text()

    useEffect(() => {
        if (typeof query === 'string' && query.length > 0) {
            search(query).then((emojis) => {
                setResults(
                    emojis.map((emoji) => ({ data: emoji, text: emoji.name, key: emoji.emoji })),
                )
            })
        } else {
            setResults([])
        }
    }, [query])

    return (
        <MentionCombobox<TMentionEmoji>
            pluginKey={ELEMENT_MENTION_EMOJI}
            items={results}
            id="emojis"
        />
    )
}
