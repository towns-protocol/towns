import { recipe } from '@vanilla-extract/recipes'
import { vars } from 'ui/styles/vars.css'

const fontSizeVariants = {
    h1: {
        fontSize: vars.fontSize.h1,
        marginTop: '1rem', // I don't know
    },
    h2: {
        fontSize: vars.fontSize.h2,
        marginTop: '0.5rem',
    },
    display: {
        fontSize: vars.fontSize.display,
        marginTop: '2rem', // I don't know
    },
}

export const LetterStyles = recipe({
    base: {
        fontFamily: 'TitleFont',
        marginTop: '0.3rem',
        fontSize: vars.fontSize.lg,
    },
    defaultVariants: {},
    variants: {
        fontSize: fontSizeVariants,
    },
})

export type LetterStylesVariantProps = keyof typeof fontSizeVariants
