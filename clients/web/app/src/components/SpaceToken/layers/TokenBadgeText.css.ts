import { style } from '@vanilla-extract/css'

export const smallText = style({
    fontFamily: 'BodyFont, sans-serif',
    fontSize: 14,
    fontWeight: 600,
    fontSmooth: 'antialias',
    letterSpacing: '0.1em',
})

export const tokenText = style({
    fontFamily: 'TitleFont, sans-serif',
    fontSize: 42,
    fontWeight: 400,
    letterSpacing: '0.25em',
    textTransform: 'uppercase',
})
