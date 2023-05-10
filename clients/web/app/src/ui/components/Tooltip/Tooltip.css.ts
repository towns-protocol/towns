import { globalStyle, style } from '@vanilla-extract/css'
import { vars } from 'ui/styles/vars.css'

export const tooltip = style({
    filter: `
        drop-shadow(0px 0px 0.5px rgba(255, 255, 255, 0.5))
        drop-shadow(0px 0px 2px rgba(0, 0, 0, 0.5))
        drop-shadow(2px 4px 16px rgba(0, 0, 0, 0.5))
    `,
    padding: `10px 10px`,
    wordBreak: `normal`,
})

export const arrow = style({
    selectors: {
        '&:after': {
            content: '',
            display: 'block',
            position: `absolute`,
            border: `6px solid`,
            borderColor: `transparent`,
        },
    },
})

export const tooltipVertical = style({})
export const tooltipHorizontal = style({})

export const tooltipBottom = style({})
export const tooltipTop = style({})
export const tooltipLeft = style({})
export const tooltipRight = style({})

globalStyle(`${tooltipVertical} ${tooltip}`, {
    maxWidth: `calc(min(var(--bounds-width) * 1px, 35ch))`,
})
globalStyle(`${tooltipHorizontal} ${tooltip}`, {
    maxWidth: `calc(min(var(--bounds-width) * 1px, 25ch))`,
})

globalStyle(`${tooltipRight} ${arrow}:after`, {
    left: '0',
    top: 'var(--tooltip-arrow-position)',
    transform: `translate(calc(-100% + 1px), -50%)`,
    borderRightColor: vars.color.background.level2,
})

globalStyle(`${tooltipLeft} ${arrow}:after`, {
    right: '0',
    top: 'var(--tooltip-arrow-position)',
    transform: `translate(calc(100% - 1px), -50%)`,
    borderLeftColor: vars.color.background.level2,
})

globalStyle(`${tooltipBottom} ${arrow}:after`, {
    left: 'var(--tooltip-arrow-position)',
    top: '0',
    transform: `translate(-50%, calc(-100% + 1px))`,
    borderBottomColor: vars.color.background.level2,
})

globalStyle(`${tooltipTop} ${arrow}:after`, {
    left: 'var(--tooltip-arrow-position)',
    bottom: '0',
    transform: `translate(-50%, calc(100% - 1px))`,
    borderTopColor: vars.color.background.level2,
})
