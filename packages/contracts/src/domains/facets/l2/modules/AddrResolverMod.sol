// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IAddrResolver} from "@ensdomains/ens-contracts/resolvers/profiles/IAddrResolver.sol";
import {IAddressResolver} from "@ensdomains/ens-contracts/resolvers/profiles/IAddressResolver.sol";

// libraries
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";

// contracts

/// @title AddrResolverMod
/// @notice Stores and retrieves blockchain addresses for ENS nodes, supporting multiple coin types (SLIP-44)
/// @dev Implements ENS IAddrResolver and IAddressResolver storage; addresses keyed by (version, node, coinType)
library AddrResolverMod {
    using CustomRevert for bytes4;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           TYPES                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @dev SLIP-44 coin type for Ethereum (used for addr(node) without coinType parameter)
    uint256 private constant COIN_TYPE_ETH = 60;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          STORAGE                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    // keccak256(abi.encode(uint256(keccak256("ens.domains.addr.resolver.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 constant STORAGE_SLOT =
        0x8b8a0bb4a3fe0b42465b90b4b0685ae0e89754526abbe657b793f43051265600;

    /// @notice Storage layout with versioned addresses: version => node => coinType => address bytes
    struct Layout {
        mapping(uint64 => mapping(bytes32 => mapping(uint256 => bytes))) versionable_addresses;
    }

    /// @notice Returns the storage layout for this module
    function getStorage() internal pure returns (Layout storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         FUNCTIONS                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Sets a blockchain address for an ENS node and coin type (SLIP-44 standard)
    /// @dev Emits AddressChanged for all coin types; also emits AddrChanged for ETH (coinType 60)
    function setAddr(
        Layout storage $,
        uint64 version,
        bytes32 node,
        uint256 coinType,
        bytes memory a
    ) internal {
        emit IAddressResolver.AddressChanged(node, coinType, a);
        if (coinType == COIN_TYPE_ETH) {
            emit IAddrResolver.AddrChanged(node, bytesToAddress(a));
        }

        $.versionable_addresses[version][node][coinType] = a;
    }

    /// @notice Sets the Ethereum address (coinType 60) for an ENS node
    function setAddr(Layout storage $, uint64 version, bytes32 node, address a) internal {
        setAddr($, version, node, COIN_TYPE_ETH, addressToBytes(a));
    }

    /// @notice Returns the address bytes for an ENS node and coin type
    function addr(
        Layout storage $,
        uint64 version,
        bytes32 node,
        uint256 coinType
    ) internal view returns (bytes memory) {
        return $.versionable_addresses[version][node][coinType];
    }

    /// @notice Returns the Ethereum address (coinType 60) for an ENS node, or address(0) if not set
    function addr(
        Layout storage $,
        uint64 version,
        bytes32 node
    ) internal view returns (address payable) {
        bytes memory a = addr($, version, node, COIN_TYPE_ETH);
        if (a.length == 0) {
            return payable(0);
        }
        return bytesToAddress(a);
    }

    /// @notice Converts 20-byte address data to an address type
    function bytesToAddress(bytes memory b) internal pure returns (address payable a) {
        require(b.length == 20);
        assembly {
            a := div(mload(add(b, 32)), exp(256, 12))
        }
    }

    /// @notice Converts an address to 20-byte address data
    function addressToBytes(address a) internal pure returns (bytes memory b) {
        b = new bytes(20);
        assembly {
            mstore(add(b, 32), mul(a, exp(256, 12)))
        }
    }
}
