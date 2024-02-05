import { style } from '@vanilla-extract/css'
import { atoms } from 'ui/styles/atoms.css'
import { scrollContainerClass } from 'ui/styles/globals/scrollcontainer.css'
import { baseline } from 'ui/styles/vars.css'

export const richText = style({
    whiteSpace: 'pre-wrap',
})

export const contentEditable = style([
    scrollContainerClass,
    atoms({
        padding: 'md',
    }),
    {
        outline: 'none',
        maxHeight: `${baseline * (4 + 22.5)}px`, // pseudo-arbitrary
    },
])
