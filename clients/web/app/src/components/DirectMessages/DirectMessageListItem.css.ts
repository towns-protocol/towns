import { style } from '@vanilla-extract/css'
import { atoms } from '../../ui/styles/atoms.css'

export const truncateTextDMList = style([
    atoms({
        overflow: 'hidden',
        paddingTop: 'xs',
        marginBottom: '-xs',
    }),
    {
        paddingBottom: '-5px',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
    },
])
