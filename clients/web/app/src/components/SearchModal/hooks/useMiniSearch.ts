import MiniSearch from 'minisearch'
import { useEffect, useMemo, useState } from 'react'
import { uniqBy } from 'lodash'
import debug from 'debug'
import { useDebounce } from 'hooks/useDebounce'
import { EventDocument } from '../types'

const log = debug('app:search')
log.enabled = true

export const useMiniSearch = (messages: EventDocument[], _search: string) => {
    const [miniSearch] = useState<MiniSearch>(
        () =>
            new MiniSearch<EventDocument>({
                idField: 'key',
                fields: ['body'],
                storeFields: ['key', 'channelId', 'body', 'source'],
            }),
    )
    const search = useDebounce(_search, 250)

    useEffect(() => {
        const filteredMessages = uniqBy(
            messages.map((m) => ({ ...m, id: m.key })),
            (e) => e.id,
        )
            .filter((m) => m?.source)
            .filter((m) => !miniSearch.has(m.id))

        miniSearch.addAll(filteredMessages)
        log(`added ${filteredMessages.length} messages to miniSearch ${miniSearch.documentCount}`)
    }, [messages, miniSearch])

    const results = useMemo(() => {
        return (
            (search.length > 1 &&
                miniSearch?.search(search, {
                    fuzzy: 0.2,
                })) ||
            []
        )
    }, [miniSearch, search])

    return results
}
