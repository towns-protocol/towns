import { recipe } from '@vanilla-extract/recipes'
import { vars } from 'ui/styles/vars.css'

const fontSizeVariants = {
    h1: {
        fontSize: vars.fontSize.h1,
    },
    h2: {
        fontSize: vars.fontSize.h2,
    },
    display: {
        fontSize: vars.fontSize.display,
    },
    sm: {
        fontSize: vars.fontSize.sm,
    },
}

export const LetterStyles = recipe({
    base: {
        fontFamily: 'TitleFont',
        fontSize: vars.fontSize.lg,
    },
    defaultVariants: {},
    variants: {
        fontSize: fontSizeVariants,
    },
})

export type LetterStylesVariantProps = keyof typeof fontSizeVariants
