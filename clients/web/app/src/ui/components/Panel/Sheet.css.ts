import { globalStyle, style } from '@vanilla-extract/css'
import { vars } from 'ui/styles/vars.css'
export const modalClass = style({})

globalStyle(`${modalClass} .react-modal-sheet-backdrop`, {
    backgroundColor: vars.color.shadow.medium + '!important',
})

globalStyle(`${modalClass} .react-modal-sheet-container`, {
    backgroundColor: vars.color.background.level1 + '!important',
})

globalStyle(`${modalClass} .react-modal-sheet-drag-indicator`, {
    backgroundColor: vars.color.background.level3 + '!important',
})
