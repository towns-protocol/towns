// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {ITextResolver} from "@ensdomains/ens-contracts/resolvers/profiles/ITextResolver.sol";

library TextResolverMod {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          STORAGE                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    // keccak256(abi.encode(uint256(keccak256("ens.domains.text.resolver.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 constant STORAGE_SLOT =
        0xccd57d47affdb87d4363b03aa46f3e8c1b9394057f472ce512f3a1ec1c667400;

    struct Layout {
        mapping(uint64 => mapping(bytes32 => mapping(string => string))) versionable_texts;
    }

    function getStorage() internal pure returns (Layout storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         FUNCTIONS                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    /**
     * Sets the text data associated with an ENS node and key.
     * May only be called by the owner of that node in the ENS registry.
     * @param node The node to update.
     * @param key The key to set.
     * @param value The text data value to set.
     */
    function setText(
        Layout storage $,
        uint64 version,
        bytes32 node,
        string calldata key,
        string calldata value
    ) internal {
        $.versionable_texts[version][node][key] = value;
        emit ITextResolver.TextChanged(node, key, key, value);
    }

    /**
     * Returns the text data associated with an ENS node and key.
     * @param node The ENS node to query.
     * @param key The text data key to query.
     * @return The associated text data.
     */
    function text(
        Layout storage $,
        uint64 version,
        bytes32 node,
        string calldata key
    ) internal view returns (string memory) {
        return $.versionable_texts[version][node][key];
    }
}
