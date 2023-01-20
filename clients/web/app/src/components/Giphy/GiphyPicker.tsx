import { IGif } from '@giphy/js-types'
import { Grid } from '@giphy/react-components'
import React from 'react'
import { useParams, useResolvedPath } from 'react-router'
import { ImageMessageContent, MessageType, useChannelId, useZionClient } from 'use-zion-client'
import { Spinner } from '@components/Spinner'
import { Box } from '@ui'
import { PATHS } from 'routes'
import { useStore } from 'store/store'
import { useCardOpenerContext } from 'ui/components/Overlay/CardOpenerContext'
import { atoms } from 'ui/styles/atoms.css'
import { themes } from 'ui/styles/themes'
import { baseline } from 'ui/styles/vars.css'
import { GiphySearchBar } from './GiphySearchBar'
import { useGiphySearchContext } from './GiphySearchContext'
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
    const isInReplyThread = useResolvedPath('.').pathname.includes(PATHS.REPLIES)
    const { theme } = useStore()
    const { fetchGifs, query, isFetching } = useGiphySearchContext()
    const { sendMessage } = useZionClient()
    const { messageId: threadId } = useParams()

    const channelId = useChannelId()
    const { closeCard } = useCardOpenerContext()
    const gutterWidth = baseline * 0.75
    const width = 350
    const gridWidth = width - gutterWidth

    // giphy api can return string or number for size
    // but matrix types only allow for number
    function checkSize(gifySize?: string | number): number | undefined {
        if (!gifySize) {
            return undefined
        }
        if (typeof gifySize === 'number') {
            return gifySize
        }
        const asNum = +gifySize
        if (isNaN(asNum)) {
            return undefined
        }
        return asNum
    }

    function onGifClick(gifData: IGif) {
        closeCard()
        // for now, saving the original and downsized images
        // downsized is saved as thumbnail, but is not actually any smaller in dimension, only size
        // and serving the downsized (thumbnail) image in timeline
        // slack serves the downsized image so that should suffice for us too
        const downsized = gifData.images.downsized
        const ogImage = gifData.images.original
        const messageContent: ImageMessageContent = {
            threadId: isInReplyThread ? threadId : undefined,
            url: ogImage.url,
            messageType: MessageType.Image,
            info: {
                size: checkSize(ogImage.size),
                w: ogImage.width,
                h: ogImage.height,
                mimetype: 'image/gif',
                thumbnail_url: downsized.url,
                thumbnail_info: {
                    w: downsized.width,
                    h: downsized.height,
                    size: checkSize(downsized.size),
                    mimetype: 'image/gif',
                },
            },
        }
        sendMessage(channelId, gifData.title, messageContent)
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
