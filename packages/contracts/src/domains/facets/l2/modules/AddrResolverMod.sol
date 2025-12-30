// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IAddrResolver} from "@ensdomains/ens-contracts/resolvers/profiles/IAddrResolver.sol";
import {IAddressResolver} from "@ensdomains/ens-contracts/resolvers/profiles/IAddressResolver.sol";

// libraries
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";

// contracts

library AddrResolverMod {
    using CustomRevert for bytes4;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           TYPES                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    uint256 private constant COIN_TYPE_ETH = 60;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          STORAGE                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    // keccak256(abi.encode(uint256(keccak256("ens.domains.addr.resolver.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 constant STORAGE_SLOT =
        0x8b8a0bb4a3fe0b42465b90b4b0685ae0e89754526abbe657b793f43051265600;

    struct Layout {
        mapping(uint64 => mapping(bytes32 => mapping(uint256 => bytes))) versionable_addresses;
    }

    function getStorage() internal pure returns (Layout storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         FUNCTIONS                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
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

    function setAddr(Layout storage $, uint64 version, bytes32 node, address a) internal {
        setAddr($, version, node, COIN_TYPE_ETH, addressToBytes(a));
    }

    function addr(
        Layout storage $,
        uint64 version,
        bytes32 node,
        uint256 coinType
    ) internal view returns (bytes memory) {
        return $.versionable_addresses[version][node][coinType];
    }

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

    function bytesToAddress(bytes memory b) internal pure returns (address payable a) {
        require(b.length == 20);
        assembly {
            a := div(mload(add(b, 32)), exp(256, 12))
        }
    }

    function addressToBytes(address a) internal pure returns (bytes memory b) {
        b = new bytes(20);
        assembly {
            mstore(add(b, 32), mul(a, exp(256, 12)))
        }
    }
}
