import { assignInlineVars } from '@vanilla-extract/dynamic'
import React from 'react'
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
    const displayImage = includes?.media?.[0]
    // TODO: this :small appended works, but should this be returned from the server?
    const displayImageUrl = displayImage && `${displayImage.url}:small`

    if (!data) {
        return <Text color="gray2">** Could not load Twitter content. **</Text>
    }

    return (
        <Box
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
                <Box
                    as="a"
                    rel="noopener noreferrer"
                    gap="sm"
                    alignContent="start"
                    href={`https://twitter.com/${author?.username}`}
                >
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
                {displayImageUrl && (
                    <RatioedBackgroundImage
                        url={displayImageUrl}
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
                    <Text size="sm" color="gray2">
                        {format(new Date(data.created_at), 'MMM, d y')}
                    </Text>
                </Box>
            </Box>
        </Box>
    )
}
