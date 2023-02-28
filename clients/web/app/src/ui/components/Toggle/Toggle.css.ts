import { style } from '@vanilla-extract/css'
import { vars } from 'ui/styles/vars.css'

export const checkboxWrapper = style({
    position: 'relative',
    borderRadius: vars.borderRadius.md,
    placeContent: 'center',
    height: vars.dims.square.square_sm,
})

export const hiddenCheckbox = style({
    position: 'absolute',
    cursor: 'pointer',
    appearance: 'none',
    width: `calc(${vars.dims.square.square_sm} * 2 + 4px)`,
    height: `calc(${vars.dims.square.square_sm} + 6px)`,
    margin: `-2px -1px`,
    borderRadius: vars.borderRadius.md,
    selectors: {
        '&:focus-visible': {
            outline: `2px solid ${vars.color.foreground.accent}`,
        },
    },
})
