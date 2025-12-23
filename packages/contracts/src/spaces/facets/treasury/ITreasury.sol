// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface ITreasury {
    /// @notice Withdraw funds from the treasury to a specified account
    /// @dev Can only be called by the owner of the contract. Will revert if account is zero address
    /// or if balance is 0
    /// @param currency The currency to withdraw (NATIVE_TOKEN for ETH, or ERC20 address)
    /// @param account The address to withdraw funds to
    function withdraw(address currency, address account) external;

    /// @notice Handle the receipt of a single ERC721 token
    /// @dev Implements the IERC721Receiver interface to safely receive ERC721 tokens
    /// @param operator The address which called `safeTransferFrom` function
    /// @param from The address which previously owned the token
    /// @param tokenId The NFT identifier which is being transferred
    /// @param data Additional data with no specified format
    /// @return bytes4 `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);

    /// @notice Handle the receipt of a single ERC1155 token
    /// @dev Implements the IERC1155Receiver interface to safely receive ERC1155 tokens
    /// @param operator The address which called the `safeTransferFrom` function
    /// @param from The address which previously owned the token
    /// @param id The ID of the token being transferred
    /// @param value The amount of tokens being transferred
    /// @param data Additional data with no specified format
    /// @return bytes4
    /// `bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))`
    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external returns (bytes4);

    /// @notice Handle the receipt of multiple ERC1155 tokens
    /// @dev Implements the IERC1155Receiver interface to safely receive multiple ERC1155 tokens
    /// @param operator The address which called the `safeBatchTransferFrom` function
    /// @param from The address which previously owned the tokens
    /// @param ids An array containing ids of each token being transferred
    /// @param values An array containing amounts of each token being transferred
    /// @param data Additional data with no specified format
    /// @return bytes4
    /// `bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))`
    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external returns (bytes4);
}
