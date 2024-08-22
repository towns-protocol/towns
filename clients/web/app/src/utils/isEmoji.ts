const emojiRegex =
    /^(?![0-9])(?!.*[0-9])(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F?|\p{Regional_Indicator}{2})(?:\u200D(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)|\p{Emoji_Modifier})*$/u

export const isEmoji = (content?: string) => {
    return typeof content === 'string' && content?.length < 6 && emojiRegex.test(content)
}
