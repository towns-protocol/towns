import { globalStyle, style } from '@vanilla-extract/css'
import { lightTheme } from 'ui/styles/vars.css'

export const tooltip = style({
    filter: `
        drop-shadow(0px 0px 1px rgba(255, 255, 255, 0.33))
        drop-shadow(0px 0px 2px rgba(0, 0, 0, 0.5))
        drop-shadow(2px 4px 16px rgba(0, 0, 0, 0.5))
    `,
    padding: `10px 10px`,
    wordBreak: `normal`,
})

globalStyle(`${lightTheme} ${tooltip} `, {
    filter: `
        drop-shadow(0px 0px 0.25px rgba(0, 0, 0, 0.25))
        drop-shadow(-2px 4px 8px rgba(0, 0, 0, 0.15))

    `,
})

export const arrow = style({
    position: `relative`,
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
    maxWidth: `calc(min(var(--bounds-width) * 1px, 40ch))`,
})
globalStyle(`${tooltipHorizontal} ${tooltip}`, {
    maxWidth: `calc(min(var(--bounds-width) * 1px, 25ch))`,
})

globalStyle(`${tooltipRight} ${arrow}:after`, {
    left: '0',
    top: 'var(--tooltip-arrow-position)',
    transform: `translate(calc(-100% + 1px), -50%)`,
    borderRightColor: `var(--background)`,
})

globalStyle(`${tooltipLeft} ${arrow}:after`, {
    right: '0',
    top: 'var(--tooltip-arrow-position)',
    transform: `translate(calc(100% - 1px), -50%)`,
    borderLeftColor: `var(--background)`,
})

globalStyle(`${tooltipBottom} ${arrow}:after`, {
    left: 'var(--tooltip-arrow-position)',
    top: '0',
    transform: `translate(-50%, calc(-100% + 1px))`,
    borderBottomColor: `var(--background)`,
})

globalStyle(`${tooltipTop} ${arrow}:after`, {
    left: 'var(--tooltip-arrow-position)',
    bottom: '0',
    transform: `translate(-50%, calc(100% - 1px))`,
    borderTopColor: `var(--background)`,
})
