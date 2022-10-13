import React from 'react'
import { Stack } from '@ui'
import { StackProps } from '../Stack/Stack'
import { ArrowHead } from './CardArrowHead'

type Props = {
    arrow?: boolean
} & StackProps

export const Card = ({ children, arrow, ...boxProps }: Props) => {
    return (
        <>
            {arrow && <ArrowHead />}
            <Stack
                background="level2"
                borderRadius="md"
                overflow="hidden"
                position="relative"
                boxShadow="card"
                {...boxProps}
            >
                {children}
            </Stack>
        </>
    )
}
