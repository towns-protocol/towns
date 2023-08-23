import { assignInlineVars } from '@vanilla-extract/dynamic'
import React, { useMemo } from 'react'
import { format } from 'date-fns'
import { UnfurlData } from '@unfurl-worker/types'
import { Box, Text } from '@ui'
import { RatioedBackgroundImage } from '@components/RatioedBackgroundImage'

type TwitterBlockProps = {
    url: string
} & UnfurlData['info']

const formatter = Intl.NumberFormat('en', { notation: 'compact' })

export const UnfurledTwitterBlock = (props: TwitterBlockProps) => {
    const { data, includes } = props
    const users = includes?.users
    const author = users?.find((user) => user.id === data.author_id)
    const media = includes?.media?.[0]
    const displayImage = useMemo(() => {
        if (!media) {
            return null
        }
        const { url, preview_image_url, height, width } = media
        const _url = preview_image_url ?? `${url}:small`
        if (!_url) {
            return null
        }
        return {
            url: _url,
            height,
            width,
        }
    }, [media])

    if (!data) {
        return <Text color="gray2">** Could not preview Twitter content. **</Text>
    }

    return (
        <Box
            as="a"
            rel="noopener noreferrer"
            href={props.url}
            target="_blank"
            maxWidth="500"
            background="level3"
            padding="md"
            borderRadius="sm"
            gap="md"
            style={assignInlineVars({
                marginRight: 'auto',
            })}
        >
            <Box flexDirection="row" alignItems="center" gap="sm">
                <Box>
                    {author?.profile_image_url ? (
                        <img
                            src={author?.profile_image_url}
                            alt={author?.username}
                            style={{ width: '48px', height: '48px', borderRadius: '50%' }}
                        />
                    ) : null}
                </Box>
                <Box gap="sm" alignContent="start">
                    <Box as="span">
                        <Text strong size="sm">
                            {author?.name}
                        </Text>
                    </Box>
                    <Text color="gray2" size="sm">
                        @{author?.username}
                    </Text>
                </Box>
            </Box>
            <Box gap="md">
                <Box maxWidth="300">
                    <Text size="sm">{data.text}</Text>
                </Box>
                {displayImage && (
                    <RatioedBackgroundImage
                        url={displayImage.url}
                        width={displayImage.width}
                        height={displayImage.height}
                    />
                )}
                <Box flexDirection="row" gap="sm" color="gray2">
                    <Text size="sm">
                        {formatter.format(data.public_metrics.retweet_count)} Retweets
                    </Text>
                    <Text size="sm" color="gray2">
                        {formatter.format(data.public_metrics.like_count)} Likes
                    </Text>
                    <Text size="sm" color="gray2" data-testid="twitter-date">
                        {format(new Date(data.created_at), 'MMM, d y')}
                    </Text>
                </Box>
            </Box>
        </Box>
    )
}
