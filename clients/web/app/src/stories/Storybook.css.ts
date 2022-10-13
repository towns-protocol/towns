import { style } from '@vanilla-extract/css'

export const crossClass = style({
    display: 'flex',
    position: 'relative',
    border: '1px solid',
    overflow: 'hidden',
    selectors: {
        '&:before': {
            content: '',
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '50%',
            height: 0,
            borderBottom: '1px solid',
            opacity: 1,
            transform: 'translate(-50%,-50%) rotate(90deg)',
        },
        '&:after': {
            content: '',
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '50%',
            height: 0,
            borderBottom: '1px solid',
            opacity: 1,
            transform: 'translate(-50%,-50%) rotate(0deg)',
        },
    },
})
