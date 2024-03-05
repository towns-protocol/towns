import React, { useEffect, useState } from 'react'
import { useComboboxSelectors } from '@udecode/plate-combobox'
import { useEmojiLockupService } from '@components/RichText/plugins/EmojiShortcutPlugin'
import { MentionCombobox } from '../../components/plate-ui/MentionCombobox'
import { TMentionEmoji } from '../../utils/ComboboxTypes'
import { ELEMENT_MENTION_EMOJI } from './createEmojiPlugin'

export const EmojiPlugin = () => {
    const [queryString, setQueryString] = useState<string | null>(null)
    const results = useEmojiLockupService(queryString).map((result) => ({
        text: result.name,
        key: result.emoji,
        data: result,
    }))
    const query = useComboboxSelectors.text()

    useEffect(() => {
        setQueryString(query)
    }, [query])

    return (
        <MentionCombobox<TMentionEmoji>
            pluginKey={ELEMENT_MENTION_EMOJI}
            items={results}
            id="emojis"
        />
    )
}
