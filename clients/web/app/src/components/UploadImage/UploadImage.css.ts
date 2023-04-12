import { style } from '@vanilla-extract/css'
import { vars } from 'ui/styles/vars.css'

export const loadingStyles = style({
    opacity: 0.3,
})

export const spinnerStyles = style({
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1rem',
})

const smallUploadoverlayStyles = {
    opacity: 0.8,
    background: vars.color.background.level1,
}

export const smallUploadImageStyles = style({
    width: '100%',
    height: '100%',
    objectPosition: 'center',
    objectFit: 'cover',
    aspectRatio: '1/1',
})

export const smallUploadHoverStyles = style({
    opacity: 0,
    transition: 'opacity 200ms ease',
    selectors: {
        '&:hover': smallUploadoverlayStyles,
    },
})

export const smallUploadIsLoadingStyles = style(smallUploadoverlayStyles)
