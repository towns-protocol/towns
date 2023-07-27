import React, { useCallback, useEffect, useRef } from 'react'
import { Search } from '@components/Search'
import { useDebounce } from 'hooks/useDebounce'
import { useDevice } from 'hooks/useDevice'
import { useGiphySearchContext } from './GiphySearchContext'

export const GiphySearchBar = () => {
    const { isTouch } = useDevice()
    const { setQuery, setIsFetching, inputValue, setInputValue } = useGiphySearchContext()
    const debouncedValue = useDebounce<string>(inputValue, 500)
    const ref = useRef<HTMLInputElement>(null)

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value)
    }

    const onClearClick = useCallback(() => {
        setIsFetching(true)
        setInputValue('')
    }, [setIsFetching, setInputValue])

    useEffect(() => {
        setIsFetching(true)
        setQuery(debouncedValue)
    }, [debouncedValue, setQuery, setIsFetching])

    useEffect(() => {
        if (!isTouch) {
            ref?.current?.focus()
        }
    }, [isTouch])

    return (
        <Search
            width="100%"
            ref={ref}
            value={inputValue}
            placeholder="Search Giphy"
            onClearClick={onClearClick}
            onChange={onChange}
        />
    )
}
