import { IGif } from '@giphy/js-types'
import { Grid } from '@giphy/react-components'
import React, { useContext } from 'react'
import {
    SendImageMessageOptions,
    SendMessageOptions,
    useChannelId,
    useTimelineThread,
    useTownsClient,
} from 'use-towns-client'
import { MessageType } from '@river-build/sdk'
import { Spinner } from '@components/Spinner'
import { ReplyToMessageContext } from '@components/ReplyToMessageContext/ReplyToMessageContext'
import { Box } from '@ui'
import { useStore } from 'store/store'
import { useCardOpenerContext } from 'ui/components/Overlay/CardOpenerContext'
import { atoms } from 'ui/styles/atoms.css'
import { themes } from 'ui/styles/themes'
import { baseline } from 'ui/styles/vars.css'
import { useDevice } from 'hooks/useDevice'
import { trackPostedMessage } from '@components/Analytics/postedMessage'
import { useGatherSpaceDetailsAnalytics } from '@components/Analytics/useGatherSpaceDetailsAnalytics'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
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

type Props = {
    threadId?: string
    threadPreview?: string
}

type GiphyPickerCardProps = Props & {
    closeCard: () => void
}

export const GiphyPicker = (props: Props) => {
    const { closeCard } = useCardOpenerContext()
    return <GiphyPickerCard {...props} closeCard={closeCard} />
}

export const GiphyPickerCard = (props: GiphyPickerCardProps) => {
    const theme = useStore((state) => state.getTheme())
    const spaceId = useSpaceIdFromPathname()

    const { isTouch } = useDevice()
    const { closeCard, threadId, threadPreview } = props

    const { fetchGifs, query, isFetching } = useGiphySearchContext()
    const { canReplyInline, replyToEventId } = useContext(ReplyToMessageContext)
    const { sendMessage } = useTownsClient()

    const isInReplyThread = !!props.threadId
    const channelId = useChannelId()
    const { threadData } = useTimelineThread(channelId, threadId)
    const gutterWidth = baseline * 0.75

    const spaceDetailsAnalytics = useGatherSpaceDetailsAnalytics({
        spaceId,
        channelId,
    })

    // small hack with "-2px" on mobile to get rid of horizontal scrollbar
    const width = isTouch ? window.innerWidth - 2 : 350
    const gridWidth = width - gutterWidth

    // giphy api can return string or number for size
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
        const messageContent: SendMessageOptions = {
            threadId: isInReplyThread ? threadId : undefined,
            threadParticipants: threadData?.userIds,
            threadPreview: threadPreview,
            messageType: MessageType.Image,
            info: {
                url: ogImage.url,
                size: checkSize(ogImage.size),
                width: ogImage.width,
                height: ogImage.height,
                mimetype: 'image/gif',
            },
            thumbnail: {
                url: downsized.url,
                width: downsized.width,
                height: downsized.height,
                size: checkSize(downsized.size),
                mimetype: 'image/gif',
            },
        } satisfies SendImageMessageOptions
        sendMessage(channelId, gifData.title, messageContent)
        trackPostedMessage({
            channelId,
            spaceId,
            threadId,
            canReplyInline,
            replyToEventId,
            messageType: 'gif',
            ...spaceDetailsAnalytics,
        })
    }

    return (
        <Box height={isTouch ? '100svh' : '420'}>
            <Box
                padding="sm"
                height={isTouch ? '100%' : '400'}
                background={isTouch ? 'level1' : 'level2'}
                borderRadius="sm"
                style={{ width: width }}
                boxShadow={isTouch ? undefined : 'dropdown'}
            >
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
