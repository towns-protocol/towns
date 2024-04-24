import { useTownsContext } from 'use-towns-client'

export const useSetNftProfilePicture = () => {
    const { casablancaClient } = useTownsContext()
    const setNft = async (
        streamId: string,
        tokenId: string,
        chainId: number,
        contractAddress: string,
    ) => {
        return casablancaClient?.setNft(streamId, tokenId, chainId, contractAddress)
    }
    return { setNft }
}
