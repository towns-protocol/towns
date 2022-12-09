import { style } from '@vanilla-extract/css'
import { vars } from 'ui/styles/vars.css'

const gap = '26px'

export const bgStyles = style([
    {
        backgroundImage: `radial-gradient(${vars.color.background.level4} 1px, transparent 0)`,
        backgroundSize: `${gap} ${gap}`,
    },
])
