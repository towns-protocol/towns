import { style } from '@vanilla-extract/css'
import { field } from '../../ui/components/_internal/Field/Field.css'

export const baseFieldStyles = field
export const textFieldStyle = style({
    borderRadius: 0,
    outline: 'none',
})
