import MiniSearch from 'minisearch'
import { useEffect, useMemo, useState } from 'react'
import { uniqBy } from 'lodash'
import debug from 'debug'
import { useDebounce } from 'hooks/useDebounce'
import { EventDocument } from '../components/SearchBar/types'

const log = debug('app:search')
log.enabled = true

export const useMiniSearch = (_messages: EventDocument[], _search: string) => {
    const [miniSearch] = useState<MiniSearch>(
        () =>
            new MiniSearch<EventDocument>({
                idField: 'key',
                fields: ['body'],
                storeFields: ['key', 'channelId', 'body'],
            }),
    )
    const messages = useDebounce(_messages, 1000)
    const search = useDebounce(_search, 250)

    const filteredMessages = useMemo(
        () =>
            uniqBy(
                messages.map((m) => ({ ...m, id: m.key })),
                (e) => e.id,
            ),
        [messages],
    )

    useEffect(() => {
        const all = filteredMessages.filter((m) => m?.source)
        const existing = all.filter((m) => miniSearch.has(m.id))
        const missing = all.filter((m) => !miniSearch.has(m.id))
        miniSearch.addAll(missing)
        existing.forEach((m) => miniSearch.replace(m))
    }, [filteredMessages, miniSearch])

    const results = useMemo(() => {
        if (!filteredMessages?.length || search.length <= 1) {
            return []
        }
        return miniSearch.search(search, {
            fuzzy: 0.2,
            combineWith: 'AND',
            prefix: true,
        })
    }, [filteredMessages?.length, miniSearch, search])

    return results
}
