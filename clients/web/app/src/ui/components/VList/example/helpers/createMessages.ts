import { rand, randColor, randNumber, randParagraph, randUserName } from '@ngneat/falso'

const profiles = createProfileList()

export function createMessageList(num = 20) {
    let date = new Date().getTime()
    const color = randColor()
    return Array(num)
        .fill(undefined)
        .map(() => {
            date = date - randNumber({ min: 1, max: 30 }) * 1000 * 60
            return createMessage(date, rand(profiles), color)
        })
        .reverse()
}

export function createProfile(index: number) {
    return {
        uid: randId(),
        name: randUserName(),
        avatarSrc: `/placeholders/nft_${(index % 20) + 1}.png`,
    } as const
}

export function createProfileList(num = 10) {
    return Array(num)
        .fill(undefined)
        .map((_, index) => createProfile(index))
}

export function createMessage(
    timestamp: number,
    profile: ReturnType<typeof createProfile> = rand(profiles),
    color: string,
) {
    const uid = randId()
    return {
        id: uid,
        profile,
        timestamp,
        color,
        message: randParagraph({
            length: randNumber({ min: 1, max: 3, precision: 1 }),
        }).join('\r\n'),
    } as const
}

export function randId() {
    return (10e3 + Math.floor(Math.random() * 10e6)).toString(16).substring(0, 6)
}
