import { style } from '@vanilla-extract/css'
import { clsx } from 'clsx'
import { navItemLinkStyle } from '@components/NavItem/_NavItem.css'
import { vars } from 'ui/styles/vars.css'

const opacityZeroStyle = style({
    opacity: 0,
})

export const favoriteStyle = style({
    transition: 'opacity 0.2s',
    selectors: {
        [`${navItemLinkStyle}:hover &`]: {
            opacity: 1,
        },
        [`${navItemLinkStyle}:hover &:hover`]: {
            color: vars.color.foreground.default,
        },
    },
})

export const favoriteStyleAutoHide = clsx(opacityZeroStyle, favoriteStyle)
