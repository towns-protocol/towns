import React, { useContext } from 'react'
import { Grid } from '@giphy/react-components'
import { IGif } from '@giphy/js-types'
import { Box } from '@ui'
import { atoms } from 'ui/styles/atoms.css'
import { themes } from 'ui/styles/themes'
import { useStore } from 'store/store'
import { Spinner } from '@components/Spinner'
import { CardOpenerContext } from 'ui/components/Overlay/CardOpener'
import { baseline } from 'ui/styles/vars.css'
import { useGiphySearchContext } from './GiphySearchContext'
import { GiphySearchBar } from './GiphySearchBar'
import { GiphyTrendingContainer } from './GiphyTrendingPill'
import './GiphyGrid.css'

const Loader = () => {
    return (
        <Box centerContent paddingTop="md">
            <Spinner />
        </Box>
    )
}

export const GiphyPicker = () => {
    const { theme } = useStore()
    const { fetchGifs, query, isFetching } = useGiphySearchContext()
    const cardOpenerContext = useContext(CardOpenerContext)
    const gutterWidth = baseline * 0.75
    const width = 350
    const gridWidth = width - gutterWidth

    function onGifClick(gifData: IGif) {
        console.log('Giphy data', gifData)
        cardOpenerContext.closeCard?.()
    }

    return (
        <Box height="420">
            <Box width={`${width}`} padding="sm" height="400" background="level2" borderRadius="sm">
                <Box>
                    <GiphySearchBar />
                    <GiphyTrendingContainer />
                </Box>
                <Box scroll>
                    {isFetching && <Loader />}
                    <Grid
                        hideAttribution
                        noLink
                        key={query}
                        width={gridWidth}
                        columns={2}
                        className={atoms({
                            visibility: isFetching ? 'hidden' : 'visible',
                        })}
                        gutter={gutterWidth}
                        backgroundColor={theme && themes[theme].layer.level1}
                        fetchGifs={fetchGifs}
                        loader={() => <Loader />}
                        onGifClick={onGifClick}
                    />
                </Box>
            </Box>
        </Box>
    )
}

export default GiphyPicker
