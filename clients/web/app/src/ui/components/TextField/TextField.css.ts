import { globalStyle, style } from '@vanilla-extract/css'

export const input = style({
    // prevent overflow
    minWidth: 40,
    appearance: 'none',
    outline: 0,
})

globalStyle(`${input}::-webkit-outer-spin-button, ${input}::-webkit-inner-spin-button`, {
    appearance: 'none',
    margin: 0,
})
