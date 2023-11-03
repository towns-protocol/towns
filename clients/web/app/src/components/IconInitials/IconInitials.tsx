import React from 'react'
import { Heading } from '@ui'
import { LetterStyles, LetterStylesVariantProps } from './IconInitials.css'

export const IconInitials = (props: {
    letterFontSize?: LetterStylesVariantProps
    children?: React.ReactNode
}) => (
    <Heading
        strong
        textTransform="uppercase"
        className={LetterStyles(props.letterFontSize ? { fontSize: props.letterFontSize } : {})}
    >
        {props.children}
    </Heading>
)
