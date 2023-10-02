import MiniSearch from 'minisearch'
import { useEffect, useMemo, useState } from 'react'
import { uniqBy } from 'lodash'
import debug from 'debug'
import { useDebounce } from 'hooks/useDebounce'
import { EventDocument } from '../components/SearchModal/types'

const log = debug('app:search')
log.enabled = true

export const useMiniSearch = (messages: EventDocument[], _search: string) => {
    const [miniSearch] = useState<MiniSearch>(
        () =>
            new MiniSearch<EventDocument>({
                idField: 'key',
                fields: ['body'],
                storeFields: ['key', 'channelId', 'body'],
            }),
    )
    const search = useDebounce(_search, 250)

    const [iteration, setIteration] = useState(0)

    useEffect(() => {
        const filteredMessages = uniqBy(
            messages.map((m) => ({ ...m, id: m.key })),
            (e) => e.id,
        )
            .filter((m) => m?.source)
            .filter((m) => !miniSearch.has(m.id))

        miniSearch.addAll(filteredMessages)
        setIteration((t) => t + 1)
    }, [messages, miniSearch])

    const results = useMemo(() => {
        if (!iteration || search.length <= 1) {
            return []
        }
        return miniSearch.search(search, {
            fuzzy: 0.2,
        })
    }, [iteration, miniSearch, search])

    return results
}
