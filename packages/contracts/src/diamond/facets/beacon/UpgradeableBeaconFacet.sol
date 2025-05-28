// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {UpgradeableBeaconBase} from "src/diamond/facets/beacon/UpgradeableBeacon.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";

/// @notice Upgradeable beacon for ERC1967 beacon proxies.
/// @author Modified from Solady
/// (https://github.com/vectorized/solady/blob/main/src/utils/UpgradeableBeacon.sol)
contract UpgradeableBeaconFacet is UpgradeableBeaconBase, OwnableBase, Facet {
    function __UpgradeableBeacon_init(address initialImplementation) external onlyInitializing {
        __UpgradeableBeacon_init_unchained(initialImplementation);
    }

    /// @dev Allows the owner to upgrade the implementation.
    function upgradeTo(address newImplementation) public virtual onlyOwner {
        _setImplementation(newImplementation);
    }

    /// @dev Returns the implementation stored in the beacon.
    /// See: https://eips.ethereum.org/EIPS/eip-1967#beacon-contract-address
    function implementation() public view returns (address result) {
        /// @solidity memory-safe-assembly
        assembly {
            result := sload(_UPGRADEABLE_BEACON_IMPLEMENTATION_SLOT)
        }
    }
}
