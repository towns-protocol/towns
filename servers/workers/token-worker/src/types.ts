import { IRequest as IttyRequest } from 'itty-router'
import { OwnedNftsResponse, NftContract, OwnedNft, OpenSeaCollectionMetadata } from 'alchemy-sdk'
import { AuthEnv } from '../../common'

export interface Env extends AuthEnv {
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

export interface GetNftsAlchemyResponse extends OwnedNftsResponse {
    blockHash: string
    ownedNfts: AccurateOwnedNft[]
    pageKey?: string // override readonly
}

// worker reponse for /getNftsForOwner
export interface GetNftsResponse extends Omit<GetNftsAlchemyResponse, 'ownedNfts'> {
    ownedNftsContract: ContractMetadata[]
}

export interface GetContractMetadataAlchemyResponse extends ContractMetadata {
    address: string
    contractMetadata: {
        name: string
        symbol: string
        totalSupply: string
        tokenType: string
        contractDeployer: string
        deployedBlockNumber: number
        openSea: OpenSeaCollectionMetadata
    }
}

// worker response for /getContractMetadata
export type GetContractMetadataResponse = ContractMetadata

// not all of the Alchemy types are defined in the SDK, this is a type
// that consists of various/necessary props from various parts of the payload, composed
// into a single type to make it easier to work with in the client
export type ContractMetadata = {
    address?: string
    name?: string
    symbol?: string
    tokenType?: string
    imageUrl?: string // from OpenSea data if available
}

export type IsHolderOfCollectionAlchemyResponse = { isHolderOfCollection: boolean }
export type IsHolderOfCollectionResponse = IsHolderOfCollectionAlchemyResponse
