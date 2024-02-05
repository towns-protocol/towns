import { BaseEditor, BaseRange, Descendant, Element, Range } from 'slate'
import { ReactEditor } from 'slate-react'
import { HistoryEditor } from 'slate-history'

declare module 'slate' {
    export interface BaseElement {
        type: string
    }
}

export type BlockQuoteElement = {
    type: 'block-quote'
    align?: string
    children: Descendant[]
}

export type BulletedListElement = {
    type: 'bulleted-list'
    align?: string
    children: Descendant[]
}

export type HeadingOneElement = {
    type: 'heading-one'
    align?: string
    children: Descendant[]
}

export type HeadingTwoElement = Omit<HeadingElement, 'type'> & { type: 'heading-two' }
export type HeadingThreeElement = Omit<HeadingElement, 'type'> & { type: 'heading-three' }
export type HeadingFourElement = Omit<HeadingElement, 'type'> & { type: 'heading-four' }
export type HeadingFiveElement = Omit<HeadingElement, 'type'> & { type: 'heading-five' }
export type HeadingSixElement = Omit<HeadingElement, 'type'> & { type: 'heading-six' }

export type LinkElement = { type: 'link'; url: string; children: Descendant[] }

export type ListItemElement = { type: 'list-item'; children: Descendant[] }

export type MentionElement = {
    type: 'mention'
    character: string
    children: CustomText[]
}

export type ParagraphElement = {
    type: 'paragraph'
    align?: string
    children: Descendant[]
}

export type CodeBlockElement = {
    type: 'code-block'
    language: string
    children: Descendant[]
}

export type CodeLineElement = {
    type: 'code-line'
    children: Descendant[]
}

type CustomElement =
    | BlockQuoteElement
    | BulletedListElement
    | HeadingOneElement
    | HeadingTwoElement
    | HeadingThreeElement
    | HeadingFourElement
    | HeadingFiveElement
    | HeadingSixElement
    | LinkElement
    | ListItemElement
    | MentionElement
    | ParagraphElement
    | CodeBlockElement
    | CodeLineElement

export type OneEnterBreak = CustomElement['type']

export type CustomText = {
    bold?: boolean
    italic?: boolean
    code?: boolean
    text: string
}

export type EmptyText = {
    text: string
}

export type CustomEditor = BaseEditor &
    ReactEditor &
    HistoryEditor & {
        nodeToDecorations?: Map<Element, Range[]>
    }

declare module 'slate' {
    interface CustomTypes {
        Editor: CustomEditor
        Element: CustomElement
        Text: CustomText | EmptyText
        Range: BaseRange & {
            [key: string]: unknown
        }
    }
}
