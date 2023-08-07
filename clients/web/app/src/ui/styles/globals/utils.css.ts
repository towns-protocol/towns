import { style } from '@vanilla-extract/css'

export const absoluteFillClass = style({
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    left: 0,
})

export const mobileAppClass = style({
    height: '100dvh',
    overflowY: 'hidden',
    overscrollBehaviorY: 'contain',
    touchAction: 'none',
    '@media': {
        '(display-mode: standalone)': {
            height: '100vh',
        },
    },
})

export const srOnlyClass = style({
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1,px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    borderWidth: '0',
})
