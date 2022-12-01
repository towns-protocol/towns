import React, { useEffect, useRef } from 'react'
import { Box, BoxProps, Icon, IconName, Stack } from '@ui'

export const MenuItem = ({
    children,
    ...props
}: BoxProps & { selected?: boolean; icon?: IconName }) => {
    const { selected } = props
    const ref = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (selected) {
            ref.current?.focus()
        }
    }, [selected])
    return (
        <Box
            grow
            paddingY="sm"
            background={{
                default: 'level2',
                hover: 'level3',
            }}
            {...props}
            tabIndex={1}
            role="button"
            as="button"
            ref={ref}
        >
            <Stack horizontal gap paddingX="md" cursor="pointer" alignItems="center">
                {props.icon && (
                    <Icon
                        color={props.color}
                        type={props.icon}
                        background="level3"
                        size="square_lg"
                        padding="sm"
                    />
                )}
                {children}
            </Stack>
        </Box>
    )
}
