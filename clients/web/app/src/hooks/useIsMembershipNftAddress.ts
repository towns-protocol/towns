import { useQuery } from '@tanstack/react-query'
import { Address, useTownsClient } from 'use-towns-client'

export function useIsMembershipNftAddress({
    address,
    spaceId,
}: {
    address: Address
    spaceId: string | undefined
}) {
    const { spaceDapp } = useTownsClient()

    return useQuery({
        queryKey: ['useIsMembershipNftAddress', spaceId, address],

        queryFn: async () => {
            if (!spaceDapp || !spaceId) {
                return false
            }
            const townMembershipTokenAddress = (await spaceDapp.getSpaceMembershipTokenAddress(
                spaceId,
            )) as Address
            return townMembershipTokenAddress === address
        },

        staleTime: Infinity,
        enabled: !!spaceDapp && !!spaceId,
    })
}
