import { globalStyle, style } from '@vanilla-extract/css'
import { darkTheme, lightTheme, vars } from 'ui/styles/vars.css'

export const buttonTextParent = style({})
export const buttonText = style({
    transition: `opacity 120ms ease`,
    opacity: 0,
    color: vars.color.foreground.gray2,
    background: 'none',
    selectors: {
        [`${buttonTextParent}:hover &`]: {
            opacity: 1,
        },
        '&:hover': {
            color: vars.color.foreground.cta1,
        },
    },
})

export const spaceIconContainer = style({})

export const gradientBackground = style({})

globalStyle(`${lightTheme} ${gradientBackground}`, {
    background: `inherit`,
})

globalStyle(`${darkTheme} ${gradientBackground}`, {
    background: `linear-gradient(180deg, #222026FF 0%, #151418FF 100%)`,
})

export const spaceUrlText = style({
    color: vars.color.foreground.gray2,
})

export const spaceHeader = style({
    position: 'fixed',
    width: `calc(var(--sizebox-width) - 1px)`,
})
