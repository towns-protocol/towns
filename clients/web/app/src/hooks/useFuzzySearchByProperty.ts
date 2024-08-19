import React, { useCallback, useMemo, useState } from 'react'
import fuzzysort from 'fuzzysort'

type FuzzySearchItem = {
    name: string
}

export function useFuzzySearchByProperty<T extends FuzzySearchItem>(
    items: T[],
    searchKey: keyof T & string = 'name' as keyof T & string,
) {
    const [searchText, setSearchText] = useState('')

    const filteredItems = useMemo(() => {
        if (!searchText) {
            return items
        }
        return fuzzysort
            .go(searchText, items, { key: searchKey, all: true })
            .map((result) => result.obj)
    }, [items, searchText, searchKey])

    const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchText(event.target.value)
    }, [])

    return {
        searchText,
        filteredItems,
        handleSearchChange,
    }
}
