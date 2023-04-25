import { style } from '@vanilla-extract/css'
import { vars } from 'ui/styles/vars.css'

export const relativePositionButton = style({
    position: 'relative',
    color: vars.color.text.inverted,
})

export const buttonProgressBackground = style({
    position: 'absolute',
    top: `0`,
    left: `0`,
    height: '100%',
    zIndex: 1,
    background: `linear-gradient(90deg, #21E078, #1FDBF1 100%)`,
})
