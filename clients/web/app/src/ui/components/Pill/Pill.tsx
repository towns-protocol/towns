import React, { Ref, forwardRef } from 'react'
import { useDevice } from 'hooks/useDevice'
import { TooltipBox, TooltipBoxProps } from '../Box/TooltipBox'

type Pill = {
    children: React.ReactNode | React.ReactNode[] | string
} & TooltipBoxProps

export const Pill = forwardRef((props: Pill, ref: Ref<HTMLElement> | undefined) => {
    const { isTouch } = useDevice()
    const {
        children,
        border = isTouch ? 'level4' : 'level3',
        background = isTouch ? 'level2' : 'level2',
        ...boxProps
    } = props
    return (
        <TooltipBox
            centerContent
            horizontal
            hoverable
            height={{ default: 'x3', mobile: 'height_md' }}
            paddingX={{ default: 'sm', mobile: 'sm' }}
            rounded="md"
            color={{ default: 'gray2', hover: 'default' }}
            fontSize="sm"
            background={background}
            alignSelf="start"
            cursor="pointer"
            border={border}
            ref={ref}
            {...boxProps}
        >
            {children}
        </TooltipBox>
    )
})
