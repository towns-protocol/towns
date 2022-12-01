import React, { forwardRef } from 'react'
import { Box, BoxProps } from '@ui'
import { Icon, IconName } from 'ui/components/Icon'
import { IconAtoms } from '../Icon/Icon.css'
import * as styles from './IconButton.css'

type Props = {
    opaque?: boolean
    active?: boolean
    icon: IconName
    size?: IconAtoms['size']
} & Omit<BoxProps, 'size'>

export const IconButton = forwardRef<HTMLDivElement, Props>((props, ref) => {
    const {
        size = 'square_sm',
        active: isActive,
        opaque: isOpaque,
        background,
        ...boxProps
    } = props

    return (
        <Box
            as="button"
            ref={ref}
            role="button"
            className={styles.iconButton}
            background={
                background ?? {
                    default: !isOpaque ? 'inherit' : isActive ? 'level3' : 'level2',
                    hover: 'level3',
                }
            }
            padding="xs"
            rounded="xs"
            color={isActive ? 'default' : 'gray2'}
            {...boxProps}
        >
            <Icon type={props.icon} size={size} />
        </Box>
    )
})
