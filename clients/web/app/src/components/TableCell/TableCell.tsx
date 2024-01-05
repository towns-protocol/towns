import React from 'react'
import { Box, Icon, IconName, Stack, Text } from '@ui'

type TableCellProps = {
    iconType: IconName
    text: string
    isError?: boolean
    onClick: () => void
}

export const TableCell = (props: TableCellProps) => {
    const { iconType, text, isError, onClick } = props

    return (
        <Stack
            horizontal
            rounded="xs"
            background={{ hover: 'level2' }}
            gap="sm"
            alignItems="center"
            padding="sm"
            onClick={onClick}
        >
            <Box padding="sm" background="level2" rounded="sm">
                <Icon
                    type={iconType}
                    size="square_md"
                    background="level2"
                    color={isError ? 'error' : 'gray2'}
                />
            </Box>
            <Text color={isError ? 'error' : 'default'}>{text}</Text>
        </Stack>
    )
}
