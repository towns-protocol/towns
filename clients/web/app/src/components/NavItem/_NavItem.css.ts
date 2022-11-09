import { style } from '@vanilla-extract/css'
import { atoms } from 'ui/styles/atoms.css'

export const highlightInactive = atoms({
    rounded: 'sm',
})

export const highlightSelectedInactive = style({})

export const highlightActive = atoms({
    rounded: 'sm',
    background: 'level2',
})

export const hoveredActive = atoms({
    rounded: 'sm',
    background: 'level2',
})

export const highlightTransitionSwift = style({})

export const highlightTransitionOut = style({
    transition: `all 320ms ease`,
})

export const highlightTransitionSelected = style({
    transition: `all 640ms ease 120ms`,
})
