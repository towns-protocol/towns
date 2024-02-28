import React from 'react'
import { UnfurlData } from '@unfurl-worker/types'
import { Box, Text } from '@ui'
import { RatioedBackgroundImage } from '@components/RatioedBackgroundImage'

export const UnfurledGenericBlock = (props: UnfurlData) => {
    return (
        <Box
            data-testid="unfurled-generic-block"
            as="a"
            href={props.url}
            rel="noopener noreferrer"
            target="_blank"
            alignSelf="start"
            background="level3"
            padding="md"
            borderRadius="sm"
            gap="md"
            maxWidth="400"
        >
            {props.image?.url && (
                <RatioedBackgroundImage
                    alt={props.title}
                    url={props.image.url}
                    width={props.image.width}
                    height={props.image.height}
                />
            )}
            <Box>
                <Text size="md">{props.title}</Text>
            </Box>
            <Text size="sm" color="gray2">
                {props.description}
            </Text>
        </Box>
    )
}
