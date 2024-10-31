import { AutoformatRule } from '@udecode/plate-autoformat'
import { BulletedListPlugin, ListItemPlugin, NumberedListPlugin } from '@udecode/plate-list/react'

import { formatList, isParagraph, preFormat } from './utils'

export const autoformatLists: AutoformatRule[] = [
    {
        mode: 'block',
        type: ListItemPlugin.key,
        match: ['* ', '- '],
        query: isParagraph,
        preFormat,
        format: (editor) => formatList(editor, BulletedListPlugin.key),
    },
    {
        mode: 'block',
        type: ListItemPlugin.key,
        match: [String.raw`^\d+\.$ `, String.raw`^\d+\)$ `],
        matchByRegex: true,
        query: isParagraph,
        preFormat,
        format: (editor) => formatList(editor, NumberedListPlugin.key),
    },
]
