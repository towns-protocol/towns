import { useRiver } from './useRiver'

export const useUserSpaces = () => {
    const { data, ...rest } = useRiver((s) => s.spaces)
    return { spaceIds: data.spaceIds, ...rest }
}
