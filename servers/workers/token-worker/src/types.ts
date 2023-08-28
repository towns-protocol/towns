import { Request as IttyRequest } from 'itty-router'
import {
    OwnedNftsResponse,
    NftContract,
    OwnedNft,
    OpenSeaCollectionMetadata,
    GetContractsForOwnerResponse,
} from 'alchemy-sdk'
import { AuthEnv, Environment } from 'worker-common'

export interface Env extends AuthEnv {
    ENVIRONMENT: Environment
    ALCHEMY_API_KEY: string
    INFURA_API_KEY: string
    INFURA_API_SECRET: string
}

export interface TokenProviderRequest extends Request {
    rpcUrl: string
    authHeader?: string
    params: IttyRequest['params']
    query: IttyRequest['query']
}

export interface IError extends Error {
    status?: number
}

interface AccurateOwnedNft extends OwnedNft {
    contractMetadata: NftContract
}

export interface GetCollectionMetadataInfuraResponse {
    contract: string
    name: string
    symbol: string
    tokenType: string
}

export interface GetCollectionsForOwnerInfuraResponse {
    total: number
    pageNumber: number
    pageSize: number
    network: string
    cursor: null | string
    account: string
    collections: {
        contract: string
        name: string
        symbol: string
        tokenType: string
    }[]
}

export interface GetNftsAlchemyResponse extends OwnedNftsResponse {
    blockHash: string
    ownedNfts: AccurateOwnedNft[]
    pageKey?: string // override readonly
}

export type GetContractsForOwnerAlchemyResponse = GetContractsForOwnerResponse

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

// worker response for /getCollectionsForOwner
export type GetCollectionsForOwnerResponse = {
    totalCount: number
    pageKey?: string
    collections: ContractMetadata[]
}

// worker reponse for /getNftsForOwner
export interface GetNftsResponse extends Omit<GetNftsAlchemyResponse, 'ownedNfts'> {
    ownedNftsContract: ContractMetadata[]
}

// worker response for /getContractMetadata
export type GetContractMetadataResponse = ContractMetadata

// This is a type for the client to work with. Reponses to the client should include this type, whether the payload is from Alchemy or Infura
export type ContractMetadata = {
    address?: string
    name?: string
    symbol?: string
    tokenType?: string
    imageUrl?: string // from OpenSea data if available
}

// TODO: remove? we probably won't use this endpoint
export type IsHolderOfCollectionAlchemyResponse = { isHolderOfCollection: boolean }
export type IsHolderOfCollectionResponse = IsHolderOfCollectionAlchemyResponse
