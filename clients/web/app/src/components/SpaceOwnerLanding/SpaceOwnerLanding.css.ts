/* eslint-disable @typescript-eslint/ban-ts-comment */
import { style } from '@vanilla-extract/css'
import { vars } from 'ui/styles/vars.css'
import { breakpoints } from 'ui/styles/breakpoints'

export const headerStyle = style({
    padding: vars.dims.baseline.x10,
    background: 'linear-gradient(180deg, rgba(48, 46, 54, 0.5) 0%, rgba(21, 20, 24, 0.5) 100%)',
})

export const contentStyle = style({
    padding: `${vars.dims.baseline.x5} ${vars.dims.baseline.x10} 0 ${vars.dims.baseline.x10}`,
    gap: vars.dims.baseline.x10,
    '@media': {
        [`screen and (min-width: ${breakpoints.desktop}px)`]: {
            flexDirection: 'row',
        },
    },
})

export const childStyle = style({
    '@media': {
        [`screen and (min-width: ${breakpoints.desktop}px)`]: {
            width: '50%',
        },
    },
})

export const copiedStyle = style({
    top: '-40px',
    left: '50%',
    transform: 'translateX(-50%)',
})
