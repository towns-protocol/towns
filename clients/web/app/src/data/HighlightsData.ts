import {
    incrementalNumber,
    rand,
    randFloat,
    randNumber,
    randSentence,
    randUser,
    seed,
} from '@ngneat/falso'
import { MessageReactions } from 'hooks/useReactions'
import { fakeUsers } from './UserData'

seed(`update-${new Date().getDay()}`)

const emojis = ['👍', '💯', '🤔', '✌️', '😍', '😇'] as const
const userIndex = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const
const images = Array(9)
    .fill(0)
    .map((_, i) => `/placeholders/frame_${i}.png`)

let getIncrementalImageIndex = incrementalNumber({
    from: 0,
    to: 10,
    step: 1,
})

export interface Message {
    id: string
    body: string
    userId: string
    reactions?: MessageReactions
    replies?: { userIds: number[]; fakeLength: number }
    imageUrl?: string
    link?: { title: string; href: string }
}

export const fakeMessages = (spaceId: string): Message[] => {
    const isMain = !spaceId
    seed(spaceId)

    getIncrementalImageIndex = incrementalNumber({
        from: 0,
        to: 10,
        step: 1,
    })

    return Array(12)
        .fill('')
        .map((_, index) => {
            const link = getRandomLink()
            const message: Message = {
                id: `message${index}`,
                body: randSentence({
                    length: Math.floor(randNumber({ min: 1, max: 2 })),
                }).join(''),
                userId: fakeUsers[rand(userIndex)].id,
                reactions: getRandomReactions(),
                replies: getRandomReplies(),
                imageUrl: !link ? getRandomImage(isMain ? 0.01 : 0.2) : undefined,
                link,
            }
            return message
        })
}

function getRandomImage(chance = 0.5) {
    const i = getIncrementalImageIndex()

    if (randFloat({ min: 0, max: 1 }) > chance && i) {
        return images[i]
    }
}

function getRandomReactions() {
    const reactions: MessageReactions = new Map()
    for (let i = 0, len = randNumber({ max: 5 }); i < len; i++) {
        const e = rand(emojis)
        reactions.set(
            e,
            new Map(
                Array(randNumber({ min: 1, max: 245 }))
                    .fill(undefined)
                    .map((r) => [randUser().id, { eventId: '' }]),
            ),
        )
    }
    return reactions
}

function getRandomReplies() {
    if (randNumber({ max: 10 }) < 5) return undefined
    const replies = randNumber({ min: 4, max: 35 })
    const numUsers = Math.max(1, Math.min(3, Math.floor(replies / 7)))
    const randomizedUsers = userIndex.slice().sort(() => Math.random() - 0.5)

    const userIds = Array(numUsers)
        .fill(0)
        .map((_, index) => randomizedUsers[index])

    return { userIds, fakeLength: replies }
}

function getRandomLink() {
    if (randNumber({ max: 10 }) < 7) return undefined
    return {
        title: 'Zion Protocol V2',
        href: 'mirror.xyz/editions/0xaf89C5E115Ab3437fCDFKJ.f',
    }
}
