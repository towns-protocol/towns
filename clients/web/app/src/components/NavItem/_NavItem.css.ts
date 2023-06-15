import { globalStyle, style } from '@vanilla-extract/css'
import { vars } from 'ui/styles/vars.css'

export const navItemLinkStyle = style({
    ':focus-visible': {
        outline: 'unset',
    },
})

export const navItemBackgroundStyle = style({
    ':hover': {
        backgroundColor: vars.color.background.level1Hover,
    },
    ':active': {
        backgroundColor: vars.color.background.level1Hover,
    },
})

globalStyle(`${navItemLinkStyle}:focus-visible ${navItemBackgroundStyle}`, {
    boxShadow: `0 0 0 1px ${vars.color.foreground.accent}`,
})
