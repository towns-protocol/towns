import React from 'react'
import { Box, Divider, Icon, Paragraph, Stack } from '@ui'

type Props = {
    name?: string
}

export const ChannelHeader = (props: Props) => {
    const { name = 'general' } = props

    return (
        <Stack gap="md" paddingX="lg">
            <Stack horizontal gap>
                <Box centerContent rounded="sm" background="level3" aspectRatio="1/1">
                    <Icon type="tag" background="level3" size="square_lg" />
                </Box>
                <Box>
                    <Paragraph>{name}</Paragraph>
                    <Paragraph color="gray2">Welcome to the #{name} channel</Paragraph>
                </Box>
            </Stack>

            <Divider space="md" />
        </Stack>
    )
}
