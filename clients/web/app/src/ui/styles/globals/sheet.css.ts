import { globalStyle, style } from '@vanilla-extract/css'
import { vars, zIndexVar } from 'ui/styles/vars.css'

export const zIndex = style({
    vars: {
        [zIndexVar]: 'tooltipsAbove',
    },
})

export const modalSheetClass = style({
    zIndex: zIndex + '!important',
})

globalStyle(`${modalSheetClass} .react-modal-sheet-backdrop`, {
    // TODO:replace with background.hover
    backgroundColor: 'rgba(0, 0, 0, 0.25) !important',
})

globalStyle(`${modalSheetClass} .react-modal-sheet-container`, {
    backgroundColor: vars.color.background.level1 + '!important',
    borderTop: '1px solid ' + vars.color.background.level3,
    borderLeft: '1px solid ' + vars.color.background.level3,
    borderRight: '1px solid ' + vars.color.background.level3,
    borderTopLeftRadius: vars.borderRadius.md + '!important',
    borderTopRightRadius: vars.borderRadius.md + '!important',
})

globalStyle(`${modalSheetClass} .react-modal-sheet-drag-indicator`, {
    backgroundColor: vars.color.background.level3 + '!important',
})
