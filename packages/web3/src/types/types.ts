export interface SpaceInfo {
    /** The on-chain address of the space. */
    address: string
    /**
     * The timestamp of when the space was created.
     * It is a {@link https://docs.ethers.org/v5/api/utils/bignumber/ ethers.BigNumber} serialized as a `string`.
     */
    createdAt: string
    /** The River `spaceId` of the space. */
    networkId: string
    /** The name of the space. */
    name: string
    /** The on-chain address of the space creator. */
    owner: string
    /** Whether the space is disabled. */
    disabled: boolean
    /** A short description of the space. */
    shortDescription: string
    /** The long description of the space. */
    longDescription: string
    /**
     * The on-chain token id of the space. All spaces are indexed by their token id in the SpaceOwner collection.
     * It is a {@link https://docs.ethers.org/v5/api/utils/bignumber/ ethers.BigNumber} serialized as a `string`.
     */
    tokenId: string
    /** The URI of the space. */
    uri: string
}
