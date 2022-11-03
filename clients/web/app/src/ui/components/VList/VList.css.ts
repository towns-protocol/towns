import { style } from '@vanilla-extract/css'

export const listStyle = style({
    display: `flex`,
    flexDirection: `column`,
    overflow: `hidden`,
})

export const scrollContainerStyle = style({
    overflowY: `scroll`,
    overflowAnchor: 'none',
    selectors: {
        [`&::-webkit-scrollbar`]: {
            display: 'none',
        },
    },
})

export const containerStyle = style({
    position: `relative`,
    width: `100%`,
    overflowAnchor: 'none',
    transition: `opacity 80ms ease-in`,
})

export const vItem = style({
    position: `absolute`,
    width: `100%`,
})
