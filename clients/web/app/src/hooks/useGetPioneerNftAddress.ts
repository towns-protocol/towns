import { useZionClient } from 'use-zion-client'

// TODO: this should not require client so that it can be used for public page
export function useGetPioneerNftAddress() {
    const { client } = useZionClient()
    return client?.pioneerNFT.pioneerNFTShim.address
}
