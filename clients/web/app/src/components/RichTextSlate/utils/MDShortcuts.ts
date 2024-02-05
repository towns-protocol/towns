import { CustomElement } from '@components/RichTextSlate/slate-types'

/**
 * @desc Starting a new line with any of these texts should convert the block of text on that line to the
 * corresponding type from the hash map below
 */
export const SLATE_MD_SHORTCUTS: { [x: string]: string } = {
    '*': 'list-item',
    '-': 'list-item',
    '+': 'list-item',
    '>': 'block-quote',
    '#': 'heading-one',
    '##': 'heading-two',
    '###': 'heading-three',
    '####': 'heading-four',
    '#####': 'heading-five',
    '######': 'heading-six',
    // # TODO: Add code block and inline code
}

/**
 * @desc Following blocks of code should reset to paragraph when user presses the Enter key once and reaches the new line.

 * @example
 * If use is typing in a `heading-one` block, when they press the Enter key and go to next line,
 * it should convert the new line into a normal `paragraph` block
 */
export const ONE_ENTER_KEY_BREAK: CustomElement['type'][] = [
    'heading-one',
    'heading-two',
    'heading-three',
    'heading-four',
    'heading-five',
    'heading-six',
    'code-line',
    'mention',
    'link',
]

/**
 * @desc Following blocks of code should NOT reset when user presses the Enter key once.
 * They SHOULD reset after user presses the Enter key <b>TWICE</b>
 *
 * @example
 * If use is typing in a `bulleted-list` block, when they press the Enter key and go to next line,
 * it should add a new bullet point, and NOT convert the line into a normal `paragraph` block.
 * When user presses the Enter key again, without typing anything in the previous line, editor should exit from
 * `bulleted-list` block and change the new line to paragraph
 *
 * @example
 * If use is typing in a `code-block`, when they press the Enter key and go to next line,
 * it should add a new line in the code block, and NOT convert the line into a normal `paragraph` block
 * When user presses the Enter key again, without typing anything in the previous line, editor should exit from
 * `code` block and change the new line to paragraph
 */
export const DOUBLE_ENTER_KEY_BREAK: CustomElement['type'][] = [
    'block-quote',
    'bulleted-list',
    'code-block',
]
