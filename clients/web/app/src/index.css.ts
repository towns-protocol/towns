import { globalStyle } from '@vanilla-extract/css'
import { Figma } from 'ui/styles/palette'

globalStyle(`:root`, {
    vars: {
        ['--focus-border']: Figma.Colors.Blue,
        ['--separator-border']: `hsla(0, 0%, 50%, 0)`,
    },
})
