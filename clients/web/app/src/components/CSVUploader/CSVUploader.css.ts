import { style } from '@vanilla-extract/css'
import { atoms } from 'ui/styles/atoms.css'
import { vars } from 'ui/styles/vars.css'

export const CSVUploaderStyles = style([
    atoms({
        padding: 'lg',
        rounded: 'md',
        cursor: 'pointer',
    }),
    {
        borderStyle: 'dashed',
        borderWidth: '2px',
        transition: 'all 0.2s ease-in-out',
        selectors: {
            '&:hover': {
                borderColor: vars.color.tone.accent,
                background: vars.color.background.level2,
            },
            '&:focus': {
                borderColor: vars.color.tone.accent,
                background: vars.color.background.level2,
                outline: 'none',
            },
        },
    },
])
