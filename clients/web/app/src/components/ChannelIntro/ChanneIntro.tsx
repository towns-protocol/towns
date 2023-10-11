import React from 'react'
import { Box, Icon, Paragraph, Stack } from '@ui'

type Props = {
    name?: string
    description?: string
    channelEncrypted?: boolean
}

export const ChannelIntro = (props: Props) => {
    const { name = 'general', description, channelEncrypted: isChannelEncrypted } = props

    return (
        <Stack gap="md" paddingX="lg" paddingY="sm">
            <Stack horizontal gap>
                <Box centerContent rounded="sm" background="level2" aspectRatio="1/1" height="x7">
                    <Icon type="tag" color="gray2" size="square_lg" />
                </Box>
                <Stack justifyContent="spaceBetween" paddingY="sm">
                    <Paragraph color="gray1">{name}</Paragraph>
                    <Paragraph color="gray2">
                        {description
                            ? description
                            : `Welcome to #${name}${
                                  isChannelEncrypted ? `, an end-to-end encrypted channel` : ``
                              }`}
                    </Paragraph>
                </Stack>
            </Stack>
        </Stack>
    )
}
