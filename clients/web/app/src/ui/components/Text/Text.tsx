import { clsx } from 'clsx'
import React, { forwardRef } from 'react'
import { Box, BoxProps } from '../Box/Box'
import { TextSprinkles, bodyFontStyle, truncateParentStyle, truncateTextStyle } from './Text.css'

type ParagraphProps = {
    as?: 'p' | 'span' | 'blockquote' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'label'
}

type LabelProps = {
    as: 'label'
    for: string
}

type Props = (ParagraphProps | LabelProps) & {
    // HTML class name
    className?: string
    // React child nodes
    children?: React.ReactNode
    // Size token
    size?: BoxProps['fontSize']
    truncate?: boolean
    noWrap?: boolean
    strong?: boolean
    display?: BoxProps['display']
    style?: BoxProps['style']
} & TextSprinkles

export type TextProps = Props & Pick<BoxProps, 'grow' | 'shrink' | 'placeholder'>

export const Text = forwardRef<HTMLElement, TextProps>((props, ref) => {
    const {
        as = 'span',
        size = 'md',
        display = 'block',
        strong = false,
        fontWeight,
        textTransform = 'none',
        textAlign = 'left',
        truncate,
        noWrap,

        whiteSpace,
        children,
        className,
        ...boxProps
    } = props

    const textProps = {
        fontSize: size,
        fontWeight: fontWeight ?? (strong ? 'strong' : undefined),
        whiteSpace: whiteSpace ?? (noWrap ? 'nowrap' : undefined),
        textTransform,
        textAlign,
    }

    return (
        <Box
            as={as}
            display={display}
            className={clsx(truncate && truncateParentStyle, bodyFontStyle.className, className)}
            {...textProps}
            {...boxProps}
            ref={ref}
        >
            {truncate ? <Truncate>{children}</Truncate> : children}
        </Box>
    )
})

const Truncate = (props: { children?: React.ReactNode }) => (
    <Box as="span" className={truncateTextStyle}>
        {props.children}
    </Box>
)
