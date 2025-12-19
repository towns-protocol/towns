// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

/// @notice Mock ENS Registry for unit testing
contract MockENS {
    mapping(bytes32 => address) public owners;
    mapping(bytes32 => address) public resolvers;

    function setOwner(bytes32 node, address owner_) external {
        owners[node] = owner_;
    }

    function setResolver(bytes32 node, address resolver_) external {
        resolvers[node] = resolver_;
    }

    function owner(bytes32 node) external view returns (address) {
        return owners[node];
    }

    function resolver(bytes32 node) external view returns (address) {
        return resolvers[node];
    }
}

/// @notice Mock Address Resolver for Name Wrapper lookup
contract MockAddrResolver {
    address public nameWrapperAddress;

    constructor(address _nameWrapper) {
        nameWrapperAddress = _nameWrapper;
    }

    function addr(bytes32) external view returns (address) {
        return nameWrapperAddress;
    }
}

/// @notice Mock Name Wrapper for unit testing
contract MockNameWrapper {
    mapping(uint256 => address) public tokenOwners;

    function setOwner(bytes32 node, address owner_) external {
        tokenOwners[uint256(node)] = owner_;
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        return tokenOwners[tokenId];
    }
}

