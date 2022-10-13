import { rand, randHexaDecimal, randNumber, randUser } from '@ngneat/falso'
import { shortenAddress } from '@components/Cards/ProfileSettingsCard'

/**
 * simplified representation of a user
 */
export type UserData = {
    id: string
    isSelf?: boolean
    displayName: string
    avatarSrc?: string
    tokens?: number
    spaceIds?: string[]
    role: string
    address: string
}

// number of avatars
const numFakeUsers = 42

export const getFakeUserData = (index?: number): UserData => {
    index = index ?? Math.ceil(Math.random() * numFakeUsers)
    const r = randUser()
    return {
        id: String(index),
        isSelf: index === 0,
        tokens: randNumber({ min: 0, max: 100 }),
        spaceIds: new Array(randNumber({ min: 1, max: 5 }))
            .fill(undefined)
            .map((_, i) => String(i)),
        avatarSrc: `/placeholders/nft_${index + 1}.png`,
        displayName: r.username,
        role: rand(['Founder', 'Moderator', 'Council Member']),
        address: shortenAddress(`0x${randHexaDecimal({ length: 42 }).join('')}`),
    }
}

/** user[] */
export const fakeUsers = Array(numFakeUsers)
    .fill(undefined)
    .map((_, i) => getFakeUserData(i))

/** {id: user} */
export const fakeUserCache = fakeUsers.reduce(
    (keep, current) => (keep = { ...keep, [current.id]: current }),
    {} as { [key: string]: UserData },
)
