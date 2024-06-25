import { clsx } from 'clsx'
import React from 'react'
import { Box, BoxProps } from '../Box/Box'
import * as styles from './Dot.css'

type Props = BoxProps
export const Dot = (props: Props) => (
    <Box
        {...props}
        width="x1"
        height="x1"
        rounded="full"
        style={{ boxShadow: `0 0 0px 2px var(--background)` }}
    >
        <Box className={clsx([props.className, styles.Dot])} />
    </Box>
)
