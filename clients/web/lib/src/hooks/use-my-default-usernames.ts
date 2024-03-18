import { useMyProfile } from './use-my-profile'

// all my usernames from all joined spaces
export const useMyDefaultUsernames = (): string[] => {
    const myProfile = useMyProfile()

    return Object.values(myProfile?.memberOf ?? {})
        .map((space) => space.username.trim())
        .filter((username) => username !== '')
}
