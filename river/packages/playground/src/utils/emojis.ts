import emojisRaw from '@emoji-mart/data/sets/14/native.json'

const emojis = Object.entries(emojisRaw.emojis).reduce((emojis, e) => {
    const key = e[0]
    const value = e[1]
    emojis[key] = {
        default: value.skins[0].native,
        skins: value.skins.map((skin) => skin.native),
        keywords: value.keywords,
        name: value.name,
    }
    return emojis
}, {} as { [key: string]: { default: string; skins: string[]; keywords: string[]; name: string } })

export const getNativeEmojiFromName = (name: string, skinIndex = 0) => {
    const emoji = emojis?.[name]
    const skin = emoji?.skins[skinIndex < emoji.skins.length ? skinIndex : 0]
    return skin ?? name
}
