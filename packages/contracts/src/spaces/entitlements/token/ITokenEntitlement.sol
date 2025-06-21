// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IEntitlement} from "src/spaces/entitlements/IEntitlement.sol";

interface ITokenEntitlement is IEntitlement {
    enum TokenType {
        ERC20,
        ERC721,
        ERC1155,
        NATIVE
    }

    struct TokenData {
        TokenType tokenType;
        address contractAddress;
        uint256 threshold; // For ERC20/ERC1155/NATIVE: minimum balance, For ERC721: minimum number of tokens
        uint256 tokenId; // Only used for ERC1155
    }

    error TokenEntitlement__NotAllowed();
    error TokenEntitlement__InvalidTokenData();
    error TokenEntitlement__InvalidTokenType();

    function getTokenData(uint256 roleId) external view returns (TokenData memory);
    function encodeTokenData(TokenData calldata data) external pure returns (bytes memory);
}
