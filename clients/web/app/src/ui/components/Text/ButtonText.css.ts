import { style } from '@vanilla-extract/css'
import { FontFamily } from 'ui/utils/FontLoader'
import { fontStyles } from './Text.css'
const f = fontStyles.find((f) => f.fontFamily === FontFamily.BodyFont)

export const base = style([{}, (f && f.className) || ''])
