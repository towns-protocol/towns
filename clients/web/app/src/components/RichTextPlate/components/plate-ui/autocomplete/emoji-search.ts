import fuzzysort from 'fuzzysort'
import { MAX_AUTOCOMPLETE_SUGGESTIONS } from './helpers'
import { TComboboxItemWithData, TMentionEmoji } from './types'

let emojiCache: Array<{
    name: string
    emoji: string
    keyword: string
}>

const EMOJI_SEARCH_PATTERN = /[^a-zA-Z0-9\s]/gi

export const emojiSearch = async (
    query: string,
): Promise<TComboboxItemWithData<TMentionEmoji>[]> => {
    const { emojis } = await import('data/emojis')

    // prepare the data once, search on []keywords and name.
    emojiCache =
        emojiCache ??
        Object.values(emojis).map((emoji) => {
            const keywords = emoji.keywords
                .map((word) => word.replace(/[^a-z0-9-_\s]/gi, ''))
                .join(',')
            return { emoji: emoji.default, keywords: keywords, name: emoji.name }
        })

    return fuzzysort
        .go(query.replace(EMOJI_SEARCH_PATTERN, ''), emojiCache, {
            keys: ['name', 'keywords'],
            all: false,
            limit: 5,
            // Don't return matches with a score lower than -150
            threshold: -150,
            // Give a higher score if string matches "name" as opposed to "keyword"
            scoreFn: (match) =>
                Math.max(match[0] ? match[0].score : -151, match[1] ? match[1].score - 50 : -151),
        })
        .map((r) => ({
            name: r.obj.name,
            emoji: r.obj.emoji,
        }))
        .slice(0, MAX_AUTOCOMPLETE_SUGGESTIONS)
        .map((_emoji) => ({
            data: _emoji,
            text: _emoji.name,
            key: _emoji.emoji,
        }))
}
