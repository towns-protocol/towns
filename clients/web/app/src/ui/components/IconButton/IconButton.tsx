import React, { forwardRef } from 'react'
import { Icon, IconName } from 'ui/components/Icon'
import { useDevice } from 'hooks/useDevice'
import { BoxProps } from '../Box/Box'
import { IconAtoms } from '../Icon/Icon.css'
import * as styles from './IconButton.css'
import { TooltipBox, TooltipBoxProps } from '../Box/TooltipBox'

type Props = {
    opaque?: boolean
    active?: boolean
    icon: IconName
    size?: IconAtoms['size']
} & Omit<BoxProps, 'size'> &
    Pick<TooltipBoxProps, 'tooltip' | 'tooltipOptions'>

export const IconButton = forwardRef<HTMLDivElement, Props>((props, ref) => {
    const {
        size = 'square_sm',
        active: isActive,
        opaque: isOpaque,
        type = 'button',
        background,
        tooltip,
        tooltipOptions,
        ...boxProps
    } = props
    const { isTouch } = useDevice()

    return (
        <TooltipBox
            as="button"
            type={type}
            ref={ref}
            role="button"
            className={styles.iconButton}
            background={
                background ?? {
                    default: !isOpaque ? 'inherit' : isActive ? 'level3' : 'level2',
                }
            }
            padding="xs"
            rounded="xs"
            color={isActive ? 'default' : 'gray2'}
            tooltip={isTouch ? undefined : tooltip}
            tooltipOptions={isTouch ? undefined : tooltipOptions}
            {...boxProps}
        >
            <Icon type={props.icon} size={size} />
        </TooltipBox>
    )
})
