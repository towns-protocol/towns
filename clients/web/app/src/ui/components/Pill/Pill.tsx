import React, { Ref, forwardRef } from 'react'
import { useDevice } from 'hooks/useDevice'
import { TooltipBox, TooltipBoxProps } from '../Box/TooltipBox'

type Pill = {
    children: React.ReactNode | React.ReactNode[] | string
} & TooltipBoxProps

export const Pill = forwardRef((props: Pill, ref: Ref<HTMLElement> | undefined) => {
    const { isTouch } = useDevice()
    const { children, border, background = isTouch ? 'level2' : 'level2', ...boxProps } = props
    const isActive = !!props.onClick

    return (
        <TooltipBox
            centerContent
            horizontal
            hoverable={isActive}
            height={{ default: 'x3', mobile: 'height_md' }}
            paddingX={{ default: 'sm', mobile: 'sm' }}
            rounded="md"
            color={{ default: 'gray2', hover: isActive ? 'default' : 'gray2' }}
            fontSize="sm"
            background={background}
            alignSelf="start"
            cursor={isActive ? 'pointer' : 'default'}
            border={border}
            ref={ref}
            {...boxProps}
        >
            {children}
        </TooltipBox>
    )
})
