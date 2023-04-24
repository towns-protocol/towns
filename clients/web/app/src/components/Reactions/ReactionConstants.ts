import { emojis } from 'data/emojis'

// extract to avoid circular dependency

type Emojis = { [key: string]: (typeof emojis)[keyof typeof emojis] }

export const getNativeEmojiFromName = (name: string, skinIndex = 0) => {
    const emoji = (emojis as Emojis)?.[name]
    const skin = emoji?.skins[skinIndex < emoji.skins.length ? skinIndex : 0]
    return skin ?? name
}
