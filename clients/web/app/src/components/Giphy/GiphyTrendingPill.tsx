import React from 'react'
import { Box, Button } from '@ui'
import { useGiphySearchContext } from './GiphySearchContext'

export const GiphyTrendingPill = ({ trendingSearch }: { trendingSearch: string }) => {
    const { setInputValue, setIsFetching, inputValue } = useGiphySearchContext()

    function onClick() {
        if (inputValue === trendingSearch) {
            return
        }
        setIsFetching(true)
        setInputValue(trendingSearch)
    }

    return (
        <Box paddingLeft="xs" paddingRight="xs">
            <Button icon="trending" size="button_xs" rounded="md" onClick={onClick}>
                {trendingSearch}
            </Button>
        </Box>
    )
}

export const GiphyTrendingContainer = () => {
    const { trendingSearches } = useGiphySearchContext()

    return (
        <Box flexDirection="row" overflowX="auto" paddingY="sm">
            {trendingSearches.map((trendingSearch) => (
                <GiphyTrendingPill key={trendingSearch} trendingSearch={trendingSearch} />
            ))}
        </Box>
    )
}
