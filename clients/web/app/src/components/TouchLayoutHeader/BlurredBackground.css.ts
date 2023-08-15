import { style } from '@vanilla-extract/css'

export const blurredBackgroundStyle = style({
    backgroundSize: '140%',
    backgroundPosition: 'center',
    maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
    WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
})
