import { style } from '@vanilla-extract/css'
import { fontSettings } from 'ui/utils/FontLoader'

export const grow = style({
    lineHeight: fontSettings[0].capSize.lineHeight,
})

export const input = style({
    minWidth: 40,
    appearance: 'none',
    outline: 0,
    resize: 'none',
    lineHeight: fontSettings[0].capSize.lineHeight,
})
