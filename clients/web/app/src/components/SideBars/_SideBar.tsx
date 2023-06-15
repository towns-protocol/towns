import React from 'react'
import { BoxProps, SizeBox } from '@ui'

type Props = BoxProps

export const SideBar = (props: Props) => {
    return <SizeBox grow scroll overflowX="hidden" {...props} absoluteFill />
}
