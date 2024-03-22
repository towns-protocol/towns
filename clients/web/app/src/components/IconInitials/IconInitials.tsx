import React from 'react'
import { clsx } from 'clsx'
import { Heading } from '@ui'
import { LetterStyles, LetterStylesVariantProps } from './IconInitials.css'

export const IconInitials = (props: {
    letterFontSize?: LetterStylesVariantProps
    children?: React.ReactNode
}) => (
    <Heading
        marketingFont
        className={clsx([
            LetterStyles(props.letterFontSize ? { fontSize: props.letterFontSize } : undefined),
        ])}
    >
        {props.children}
    </Heading>
)
