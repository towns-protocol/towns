// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
interface ISpaceOwnerBase {
    struct Space {
        string name;
        string uri;
        uint256 tokenId;
        uint256 createdAt;
        string shortDescription;
        string longDescription;
    }

    event SpaceOwner__UpdateSpace(address indexed space);
    event SpaceOwner__SetFactory(address factory);
    event SpaceOwner__SetDefaultUri(string uri);

    error SpaceOwner__OnlyFactoryAllowed();
    error SpaceOwner__OnlySpaceOwnerAllowed();
    error SpaceOwner__SpaceNotFound();
    error SpaceOwner__DefaultUriNotSet();
}

interface ISpaceOwner is ISpaceOwnerBase {
    /// @notice Set the factory address that is allowed to mint spaces
    function setFactory(address factory) external;

    /// @notice Get the factory address
    function getFactory() external view returns (address);

    /// @notice Set the default URI
    function setDefaultUri(string memory uri) external;

    /// @notice Get the default URI
    function getDefaultUri() external view returns (string memory);

    /// @notice Get the next token id that will be used to mint a space
    function nextTokenId() external view returns (uint256);

    /// @notice Mint a space
    /// @dev Only the factory is allowed to mint spaces
    /// @param name The name of the space
    /// @param uri The URI of the space
    /// @param space The address of the space
    /// @param shortDescription The short description of the space
    /// @param longDescription The long description of the space
    /// @return tokenId The token id of the minted space
    function mintSpace(
        string calldata name,
        string calldata uri,
        address space,
        string calldata shortDescription,
        string calldata longDescription
    ) external returns (uint256 tokenId);

    /// @notice Get the space info
    /// @param space The address of the space
    /// @return space The space info
    function getSpaceInfo(address space) external view returns (Space memory);

    /// @notice Get the space address by token id
    /// @param tokenId The token id of the space
    /// @return space The address of the space
    function getSpaceByTokenId(uint256 tokenId) external view returns (address);

    /// @notice Update the space info
    /// @dev Only the space owner is allowed to update the space info
    /// @param space The address of the space
    /// @param name The name of the space
    /// @param uri The URI of the space
    /// @param shortDescription The short description of the space
    /// @param longDescription The long description of the space
    function updateSpaceInfo(
        address space,
        string calldata name,
        string calldata uri,
        string calldata shortDescription,
        string calldata longDescription
    ) external;
}
