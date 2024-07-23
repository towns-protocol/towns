import React, { forwardRef } from 'react'
import { format, formatDistance } from 'date-fns'
import { Box, BoxProps, Stack, Text } from '@ui'
import { Avatar } from '@components/Avatar/Avatar'

type Props = {
    children: React.ReactNode
    relativeDate?: boolean
    avatar: string
    timestamp: number
    name: string
} & BoxProps
export const ExampleMessage = forwardRef<HTMLElement, Props>((props, ref) => {
    const { children, avatar, name, relativeDate: isRelativeDate, timestamp, ...boxProps } = props

    const date = timestamp
        ? isRelativeDate
            ? `${formatDistance(timestamp, Date.now(), {
                  addSuffix: true,
              })}`
            : format(timestamp, 'h:mm a')
        : undefined

    return (
        <Stack {...boxProps} ref={ref}>
            <Stack horizontal gap>
                <Box>
                    <Avatar src={avatar} />
                </Box>
                <Stack gap>
                    <Stack horizontal gap="sm">
                        <Text color="gray1">{name}</Text>
                        <Text color="gray2">{date}</Text>
                    </Stack>
                    <Box color="default">{children}</Box>
                </Stack>
            </Stack>
        </Stack>
    )
})
