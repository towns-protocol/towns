import { useUserLookupStore } from '../store/use-user-lookup-store'

export const useMemberOf = (userId: string | undefined) => {
    return useUserLookupStore((s) => (userId ? s.allUsers[userId] : undefined))
}
