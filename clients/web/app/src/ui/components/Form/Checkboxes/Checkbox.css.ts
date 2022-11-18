import { globalStyle, style } from '@vanilla-extract/css'
import { vars } from 'ui/styles/vars.css'

export const checkboxWrapper = style({
    position: 'relative',
    width: vars.dims.square.square_sm,
    height: vars.dims.square.square_sm,
    borderRadius: vars.borderRadius.xs,
    background: vars.color.background.level4,
    display: 'grid',
    placeContent: 'center',
})

export const hiddenCheckbox = style({
    appearance: 'none',
    width: vars.dims.square.square_sm,
    height: vars.dims.square.square_sm,
    borderRadius: vars.borderRadius.xs,
    selectors: {
        '&:focus': {
            outline: `2px solid ${vars.color.foreground.etherum}`,
        },
    },
})

export const svg = style({
    position: 'absolute',
    width: '90%',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    opacity: 0,
})

globalStyle(`${hiddenCheckbox}:checked + ${svg}`, {
    opacity: '1',
})
