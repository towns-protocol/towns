import { style } from '@vanilla-extract/css'
import { atoms } from 'ui/styles/atoms.css'

export const inactive = atoms({
    rounded: 'sm',
})

export const active = atoms({
    rounded: 'sm',
    background: 'level2',
})

export const transition = style({
    transition: `all 320ms ease`,
})
