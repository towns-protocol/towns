import { clsx } from 'clsx'
import React from 'react'
import { Stack, StackProps } from '../Stack/Stack'
import * as style from './Tooltip.css'

export const Tooltip = ({ children, ...boxProps }: { children: React.ReactNode } & StackProps) => (
    <Stack
        paddingX="md"
        paddingY="sm"
        background="default"
        color="gray2"
        rounded="sm"
        fontSize="sm"
        className={clsx(style.tooltip, style.arrowLeft)}
        {...boxProps}
    >
        {children}
    </Stack>
)
