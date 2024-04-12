import { AutoformatRule } from '@udecode/plate-autoformat'
import { ELEMENT_LI, ELEMENT_OL, ELEMENT_UL } from '@udecode/plate-list'

import { formatList, isParagraph, preFormat } from './utils'

export const autoformatLists: AutoformatRule[] = [
    {
        mode: 'block',
        type: ELEMENT_LI,
        match: ['* ', '- '],
        preFormat,
        format: (editor) => formatList(editor, ELEMENT_UL),
    },
    {
        mode: 'block',
        type: ELEMENT_LI,
        match: ['1. ', '1) '],
        preFormat,
        format: (editor) => formatList(editor, ELEMENT_OL),
    },
    {
        mode: 'text',
        match: ['\n* ', '\n- '],
        query: isParagraph,
        format: (editor) => {
            editor.insertBreak()
            formatList(editor, ELEMENT_UL)
        },
    },
    {
        mode: 'text',
        match: ['\n1. ', '\n1) '],
        query: isParagraph,
        format: (editor) => {
            editor.insertBreak()
            formatList(editor, ELEMENT_OL)
        },
    },
]
