import { GifsResult, GiphyFetch, Result, request } from '@giphy/js-fetch-api'
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { env } from 'utils'

export interface IGiphySearchContext {
    setQuery: (query: string) => void
    setIsFetching: (val: boolean) => void
    query: string
    fetchGifs: (offset: number) => Promise<GifsResult>
    isFetching: boolean
    trendingSearches: string[]
    inputValue: string
    setInputValue: (val: string) => void
    setOptedIn: (val: boolean) => void
}

const GiphySearchContext = createContext<IGiphySearchContext | undefined>(undefined)

export function useGiphySearchContext(): IGiphySearchContext {
    const context = useContext(GiphySearchContext)
    if (!context) {
        throw new Error('useGiphySearchContext must be used in GiphySearchContext')
    }
    return context
}

const emptyGifsResult = {
    data: [],
    pagination: { total_count: 0, count: 0, offset: 0 },
    meta: { status: 200, msg: 'OK', response_id: '' },
}

export function GiphySearchContextProvider({ children }: { children?: JSX.Element }) {
    const apiKey = env.VITE_GIPHY_API_KEY
    const initialQuery = ''
    const gf = useMemo(() => new GiphyFetch(apiKey), [apiKey])
    const [inputValue, setInputValue] = useState('')
    const [query, setQuery] = useState(initialQuery)
    const [isFetching, setIsFetching] = useState(false)
    const [trendingSearches, setTrendingSearches] = useState<string[]>([])
    // placeholder for if we put a UX layer for users to select opting in
    // also to prevent trending search call on load
    const [optedIn, setOptedIn] = useState(false)

    // **setIsFetching**
    // <Grid /> from Giphy has it's own debounce which doesn't call this method immediately
    // so setIsFetching(true) is also called from a couple other components on user interaction for better UX
    const fetchGifs = useCallback(
        async (offset: number) => {
            let result: GifsResult = emptyGifsResult
            setIsFetching(true)
            if (query) {
                result = await gf.search(query, {
                    offset,
                })
            } else {
                result = await gf.trending({ offset })
            }
            setIsFetching(false)
            return result
        },
        [gf, query],
    )

    useEffect(() => {
        if (!optedIn) {
            return
        }

        const fetchTrendingSearches = async () => {
            try {
                const { data } = (await request(
                    `trending/searches?api_key=${apiKey}`,
                )) as Result & {
                    data: string[]
                }
                setTrendingSearches(data || [])
            } catch (error) {
                console.error(error)
            }
        }
        fetchTrendingSearches()
    }, [apiKey, optedIn])

    const value = React.useMemo(
        () => ({
            setQuery,
            fetchGifs,
            query,
            isFetching,
            setIsFetching,
            trendingSearches,
            inputValue,
            setInputValue,
            setOptedIn,
        }),
        [fetchGifs, query, isFetching, trendingSearches, inputValue, setInputValue],
    )

    return <GiphySearchContext.Provider value={value}>{children}</GiphySearchContext.Provider>
}
