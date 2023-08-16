import { globalStyle } from '@vanilla-extract/css'
import { vars } from '../vars.css'
import './debug.css'
import './fonts.css'

globalStyle('html, body', {
    textRendering: 'optimizeLegibility',
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
    fontSize: vars.fontSize.md,
    touchAction: 'pan-x pan-y',
    backgroundColor: vars.color.background.level1,
    overscrollBehavior: 'none',
})

globalStyle('*', {
    margin: 0,
    padding: 0,
    border: 0,
    boxSizing: 'border-box',
    verticalAlign: 'baseline',
    WebkitTapHighlightColor: 'transparent',
    textSizeAdjust: 'none',
    '@media': {
        '(hover: none)': {
            WebkitTouchCallout: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
        },
    },
})

globalStyle('ul, ol', {
    listStyle: 'none',
})

globalStyle('h1', {
    fontSize: vars.fontSize.h1,
})

globalStyle('h2', {
    fontSize: vars.fontSize.h2,
})

globalStyle('h3', {
    fontSize: vars.fontSize.h3,
})

globalStyle('h4', {
    fontSize: vars.fontSize.lg,
})

globalStyle('p', {
    fontSize: vars.fontSize.md,
})

globalStyle('table', {
    borderCollapse: 'collapse',
    borderSpacing: 0,
})

globalStyle('a', {
    textDecoration: 'none',
    color: 'inherit',
})

globalStyle('*:focus', {
    border: `none`,
    outline: 'none',
})

globalStyle('*:focus-visible', {
    border: `none`,
    outlineColor: vars.color.foreground.accent,
    outlineWidth: 1,
    outlineStyle: 'solid',
    outlineOffset: -1,
})

globalStyle('*:-webkit-autofill', {
    WebkitTextFillColor: vars.color.foreground.default,
    WebkitBoxShadow: `0 0 0 100px ${vars.color.background.level2} inset`,
})
