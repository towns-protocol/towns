import { useQuery } from '@tanstack/react-query'
import { useZionClient } from 'use-zion-client'
import { Address } from 'wagmi'

export function useIsMembershipNftAddress({
    address,
    spaceId,
}: {
    address: Address
    spaceId: string | undefined
}) {
    const { spaceDapp } = useZionClient()

    return useQuery({
        queryKey: ['useIsMembershipNftAddress', spaceId, address],

        queryFn: async () => {
            if (!spaceDapp || !spaceId) {
                return false
            }
            const townMembershipTokenAddress = (await spaceDapp.getTownMembershipTokenAddress(
                spaceId,
            )) as Address
            return townMembershipTokenAddress === address
        },

        staleTime: Infinity,
        enabled: !!spaceDapp && !!spaceId,
    })
}
