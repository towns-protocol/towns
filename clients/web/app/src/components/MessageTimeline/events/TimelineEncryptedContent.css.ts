import { globalStyle, keyframes, style } from '@vanilla-extract/css'
import { vars } from 'ui/styles/vars.css'

export const main = style({})

export const hoverBackground = style({
    transition: 'background 320ms',
    selectors: {
        [`${main}:hover &`]: {
            background: vars.color.foreground.gray2,
        },
    },
})

export const hoverColor = style({
    transition: 'color 320ms',
    color: vars.color.background.level2,
    selectors: {
        [`${main}:hover &`]: {
            color: vars.color.foreground.gray2,
        },
    },
})

const loading = keyframes({
    ['0%']: {
        transform: `rotate(0deg)`,
    },
    ['100%']: {
        transform: `rotate(360deg)`,
    },
})

export const loader = style({
    display: 'inline-block',
    position: 'relative',
    width: '14px',
    height: '14px',
})

globalStyle(`${loader} div`, {
    animation: `${loading} 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite`,
    boxSizing: 'border-box',
    display: 'block',
    position: 'absolute',
    width: '12px',
    height: '12px',
    border: `1.5px solid ${vars.color.background.level2}`,
    opacity: 1,
    borderRadius: '50%',
    borderColor: '#fff transparent transparent transparent',
})
globalStyle(`${loader} div:nth-child(1)`, {
    animationDelay: '-0.45s',
})

globalStyle(`${loader} div:nth-child(2)`, {
    animationDelay: '-0.3s',
})

globalStyle(`${loader} div:nth-child(3)`, {
    animationDelay: '-0.15s',
})
