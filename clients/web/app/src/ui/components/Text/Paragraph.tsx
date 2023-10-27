import React, { forwardRef } from 'react'
import { BoxProps } from '../Box/Box'
import { Text } from './Text'
import { TextSprinkles } from './Text.css'

export type ParagraphProps = {
    as?: 'p' | 'span' | 'blockquote' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5'
    className?: string
    children?: React.ReactNode
    size?: 'xs' | 'sm' | 'md' | 'lg'
    truncate?: boolean
    strong?: boolean
} & Omit<TextSprinkles, 'size' | 'fontSize'> &
    Pick<BoxProps, 'grow' | 'shrink' | 'display' | 'style'>

export const Paragraph = forwardRef<HTMLElement, ParagraphProps>((props, ref) => {
    return <Text as="p" size="md" {...props} ref={ref} />
})

export const P = Paragraph
