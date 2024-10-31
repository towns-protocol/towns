import {
    BoldPlugin,
    CodePlugin,
    ItalicPlugin,
    StrikethroughPlugin,
    UnderlinePlugin,
} from '@udecode/plate-basic-marks/react'
import { AutoformatRule } from '@udecode/plate-autoformat'

export const autoformatMarks: AutoformatRule[] = [
    {
        match: '***',
        mode: 'mark',
        type: [BoldPlugin.key, ItalicPlugin.key],
    },
    {
        match: '__*',
        mode: 'mark',
        type: [UnderlinePlugin.key, ItalicPlugin.key],
    },
    {
        match: '__**',
        mode: 'mark',
        type: [UnderlinePlugin.key, BoldPlugin.key],
    },
    {
        match: '___***',
        mode: 'mark',
        type: [UnderlinePlugin.key, BoldPlugin.key, ItalicPlugin.key],
    },
    {
        match: '**',
        mode: 'mark',
        type: BoldPlugin.key,
    },
    {
        match: '__',
        mode: 'mark',
        type: UnderlinePlugin.key,
    },
    {
        match: '*',
        mode: 'mark',
        type: ItalicPlugin.key,
    },
    {
        match: '_',
        mode: 'mark',
        type: ItalicPlugin.key,
    },
    {
        match: '~~',
        mode: 'mark',
        type: StrikethroughPlugin.key,
    },
    {
        match: '`',
        mode: 'mark',
        type: CodePlugin.key,
    },
]
