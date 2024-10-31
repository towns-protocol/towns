import { globalStyle, style } from '@vanilla-extract/css'
import { lightTheme } from 'ui/styles/vars.css'

export const emojiPickerClassName = style({})

globalStyle(`body`, {
    vars: {
        [`--rgb-background`]: `34, 32, 38`,
        [`--color`]: `234, 32, 38`,
        [`--rgb-accent`]: `	31,	237, 138`,
    },
})

globalStyle(`:root .${lightTheme}`, {
    vars: {
        [`--rgb-background`]: `240, 240, 240`,
        [`--rgb-color`]: `90, 90, 90`,
        [`--rgb-accent`]: `31, 237, 138`,
        [`--rgb-input`]: `220, 220, 220`,
    },
})

globalStyle('em-emoji-picker input', { background: 'var(--rgb-background)' })

globalStyle('em-emoji-picker .bar', {
    display: 'none',
})
