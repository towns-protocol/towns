import React, { CSSProperties, forwardRef } from 'react'
import { FontFamilyClass } from 'ui/utils/FontLoader'
import { Text, TextProps } from './Text'

enum HeadingNames {
    h1 = 'h1',
    h2 = 'h2',
    h3 = 'h3',
    h4 = 'h4',
}

const HeadingLevel = {
    1: { el: HeadingNames.h1, size: 'h1' as const },
    2: { el: HeadingNames.h2, size: 'h2' as const },
    3: { el: HeadingNames.h3, size: 'h3' as const },
    4: { el: HeadingNames.h3, size: 'h4' as const },
} as const

type HeadingProps = {
    /**
     * Custom classname appended to generated one
     */
    className?: string
    children?: React.ReactNode
    style?: CSSProperties
    marketingFont?: boolean
    /**
     * Heading level, ordered from most important and down, equivalent to H1, H2, etc.
     */
    level?: keyof typeof HeadingLevel
} & Omit<TextProps, 'size' | 'fontSize'>

export const Heading = forwardRef<HTMLElement, HeadingProps>((props, ref) => {
    const { level = 1, marketingFont, className: _className, ...textProps } = props
    const className = !marketingFont
        ? _className
        : _className
        ? `${FontFamilyClass.MarketingFont} ${_className}`
        : FontFamilyClass.MarketingFont
    const { el, size } = HeadingLevel[level]
    return <Text as={el} size={size} ref={ref} className={className} {...textProps} />
})
