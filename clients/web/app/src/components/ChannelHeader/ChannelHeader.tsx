import React from 'react'
import { Box, Icon, Paragraph, Stack } from '@ui'

type Props = {
    name?: string
    description?: string
}

export const ChannelHeader = (props: Props) => {
    const { name = 'general', description } = props

    return (
        <Stack gap="md" paddingX="lg" paddingY="sm">
            <Stack horizontal gap>
                <Box centerContent rounded="sm" background="level3" aspectRatio="1/1" height="x7">
                    <Icon type="tag" color="gray2" background="level3" size="square_lg" />
                </Box>
                <Stack justifyContent="spaceBetween" paddingY="sm">
                    <Paragraph>{name}</Paragraph>
                    <Paragraph color="gray1">
                        {description ? description : `Welcome to the #${name} channel`}
                    </Paragraph>
                </Stack>
            </Stack>
        </Stack>
    )
}
