import { clsx } from 'clsx'
import React from 'react'
import { Box, BoxProps } from 'ui/components/Box/Box'
import { FieldTone } from '../types'
import * as styles from './FieldOutline.css'

type Props = {
    tone: FieldTone
    withBorder?: boolean
    disabled?: boolean
    rounded?: BoxProps['rounded']
} & BoxProps

export const FieldOutline = (props: Props) => (
    <Box
        absoluteFill
        rounded={props.rounded ?? 'sm'}
        pointerEvents="none"
        {...props}
        className={clsx([styles.fieldOutline, styles.fieldTones[props.tone]])}
    />
)
