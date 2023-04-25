import React from 'react'
import { UnfurlData } from '@unfurl-worker/types'
import { Box, Text } from '@ui'
import { atoms } from 'ui/styles/atoms.css'

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
            {props.image && (
                <img
                    alt={props.title}
                    className={atoms({
                        borderRadius: 'sm',
                        width: '100%',
                    })}
                    src={props.image.url}
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
