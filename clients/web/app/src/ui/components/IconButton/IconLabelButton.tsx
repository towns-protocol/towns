import React, { forwardRef } from 'react'
import { Box, BoxProps } from '../Box/Box'
import { IconName } from '../Icon/Icon'
import { Text } from '../Text/Text'
import { IconButton } from './IconButton'

type Props = { label: string; icon?: IconName } & Omit<BoxProps, 'size'>

export const IconLabelButton = forwardRef<HTMLInputElement, Props>(
    ({ label, icon = 'plus', ...buttonProps }, ref) => (
        <Box
            horizontal
            gap="sm"
            as="label"
            alignItems="center"
            cursor="pointer"
            color={{ hover: 'default', default: 'gray1' }}
            background={{ hover: 'level2' }}
            insetLeft="xs"
            paddingLeft="sm"
            paddingRight="md"
            height="input_lg"
            rounded="sm"
        >
            <IconButton
                background="level2"
                icon={icon}
                // size="square_lg"
                {...buttonProps}
                padding="sm"
                ref={ref}
            />
            <Text color="inherit">{label}</Text>
        </Box>
    ),
)
