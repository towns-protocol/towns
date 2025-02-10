import fuzzysort from 'fuzzysort'
import { TComboboxItemWithData, TMentionTicker } from './types'

export const tickerSearch = async (
    query: string,
    items: TComboboxItemWithData<TMentionTicker>[],
): Promise<TComboboxItemWithData<TMentionTicker>[]> => {
    return fuzzysort
        .go(query, items, {
            keys: ['data.name', 'data.address', 'data.symbol'],
            all: true,
            limit: 6,
        })
        .map((result) => result.obj)
}
