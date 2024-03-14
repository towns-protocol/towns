import { globalStyle, style } from '@vanilla-extract/css'
import { debugClass } from './debug.css'
import { vars } from '../vars.css'

export const scrollContainerClass = style({
    overflowX: 'hidden',
    overflowY: 'scroll',
    scrollbarWidth: 'none',
    overflowAnchor: 'none',
    overscrollBehaviorY: 'contain',
})

globalStyle(`${scrollContainerClass}::-webkit-scrollbar`, {
    display: 'none',
})

export const scrollbarsClass = style({
    overflowY: 'scroll',
})

globalStyle(`${scrollbarsClass}::-webkit-scrollbar`, {
    width: '4px',
    height: '4px',
    display: 'block',
})

globalStyle(`${scrollbarsClass}::-webkit-scrollbar-thumb`, {
    backgroundColor: vars.color.background.level3,
    borderRadius: '2px',
})

globalStyle(`${scrollbarsClass}::-webkit-scrollbar-thumb:hover`, {
    backgroundColor: vars.color.background.level4,
})

globalStyle(`${scrollbarsClass}::-webkit-scrollbar-track`, {
    backgroundColor: 'inherit',
})

globalStyle(`${scrollbarsClass}::-webkit-scrollbar-track:hover`, {
    backgroundColor: vars.color.background.level2,
})

globalStyle(`${debugClass} ${scrollContainerClass}::-webkit-scrollbar`, {
    border: '2px dashed yellow',
})
