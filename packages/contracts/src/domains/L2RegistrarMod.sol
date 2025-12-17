// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IL2Registry} from "./IL2Registry.sol";

// libraries
import {StringUtils} from "@ensdomains/ens-contracts/utils/StringUtils.sol";

using StringUtils for string;

/// @notice Emitted when a new name is registered
/// @param label The registered label (e.g. "name" in "name.eth")
/// @param owner The owner of the newly registered name
event NameRegistered(string indexed label, address indexed owner);

// keccak256(abi.encode(uint256(keccak256("domains.l2registrar.storage")) - 1)) & ~bytes32(uint256(0xff))
bytes32 constant STORAGE_SLOT = 0xd4816cf0250f6085b4635e5afeea5c62cd701214448c9b13566f8b4916ff9600;

struct Layout {
    /// @notice Reference to the target registry contract
    IL2Registry registry;
    /// @notice The chainId for the current chain
    uint256 chainId;
    /// @notice The coinType for the current chain (ENSIP-11)
    uint256 coinType;
}

function getStorage() pure returns (Layout storage $) {
    assembly {
        $.slot := STORAGE_SLOT
    }
}

function register(string calldata label, address owner) {
    IL2Registry registry = getStorage().registry;
    bytes32 node = labelToNode(registry, label);
    bytes memory addr = abi.encodePacked(owner); // Convert address to bytes
    uint256 coinType = getStorage().coinType; // Get the coinType from the storage

    // Set the forward address for the current chain. This is needed for reverse resolution.
    // E.g. if this contract is deployed to Base, set an address for chainId 8453 which is
    // coinType 2147492101 according to ENSIP-11.
    registry.setAddr(node, coinType, addr);

    // Set the forward address for mainnet ETH (coinType 60) for easier debugging.
    registry.setAddr(node, 60, addr);

    // Register the name in the L2 registry
    registry.createSubnode(registry.baseNode(), label, owner, new bytes[](0));
    emit NameRegistered(label, owner);
}

function available(string calldata label) view returns (bool) {
    IL2Registry registry = getStorage().registry;
    bytes32 node = labelToNode(registry, label);
    uint256 tokenId = uint256(node);
    try registry.ownerOf(tokenId) {
        return false;
    } catch {
        if (label.strlen() >= 3) {
            return true;
        }
        return false;
    }
}

function labelToNode(IL2Registry registry, string calldata label) view returns (bytes32) {
    return registry.makeNode(registry.baseNode(), label);
}
