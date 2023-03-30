import { useZionClient } from 'use-zion-client'

export function useGetPioneerNftAddress() {
    const { client } = useZionClient()
    return client?.pioneerNFT.pioneerNFTShim.address
}
