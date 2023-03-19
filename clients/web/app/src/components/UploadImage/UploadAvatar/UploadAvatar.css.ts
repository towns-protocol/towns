import { style } from '@vanilla-extract/css'
import { vars } from 'ui/styles/vars.css'

const overlayStyles = {
    opacity: 0.8,
    background: vars.color.background.level1,
}

export const avatarHoverStyles = style({
    opacity: 0,
    transition: 'opacity 200ms ease',
    selectors: {
        '&:hover': overlayStyles,
    },
})

export const avatarIsLoadingStyles = style(overlayStyles)
