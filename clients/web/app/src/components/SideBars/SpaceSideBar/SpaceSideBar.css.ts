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
    background: `linear-gradient(180deg, #252026FF 0%, var(--background) 100%)`,
})

export const spaceUrlText = style({
    color: vars.color.foreground.gray2,
})

export const spaceHeader = style({
    position: 'fixed',
    width: `calc(var(--sizebox-width) - 1px)`,
})

// position tweaks to keep spacing while maintinaing correct position as sticky
export const stickyHeaderInset = style({
    marginTop: `calc(-1 * ${vars.dims.baseline.x3})`,
    marginBottom: `calc(-1 * ${vars.dims.baseline.x1})`,
})
