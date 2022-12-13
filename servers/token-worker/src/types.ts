import { Request as IttyRequest } from 'itty-router'
import { OwnedNftsResponse, NftContract, OwnedNft } from 'alchemy-sdk'

export interface Env {
    ALCHEMY_API_KEY: string
}

export interface RequestWithAlchemyConfig extends Request {
    rpcUrl: string
    params: IttyRequest['params']
    query: IttyRequest['query']
}

export interface IError extends Error {
    status?: number
}

interface AccurateOwnedNft extends OwnedNft {
    contractMetadata: NftContract
}
export interface AccurateNftResponse extends OwnedNftsResponse {
    blockHash: string
    ownedNfts: AccurateOwnedNft[]
}

export type ContractMetadata = {
    address?: string
    name?: string
    symbol?: string
    tokenType?: string
    imageUrl?: string
}

export interface ContractMetadataResponse extends Omit<AccurateNftResponse, 'ownedNfts'> {
    ownedNftsContract: ContractMetadata[]
}
