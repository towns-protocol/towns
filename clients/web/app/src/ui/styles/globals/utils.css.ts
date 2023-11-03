import { style } from '@vanilla-extract/css'

export const mobileAppClass = style({
    height: '100dvh',
    width: '100vw',
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
