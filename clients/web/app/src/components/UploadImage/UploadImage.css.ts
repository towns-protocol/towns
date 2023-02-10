import { style } from '@vanilla-extract/css'

export const loadingStyles = style({
    opacity: 0.3,
})

export const spinnerStyles = style({
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1rem',
})
