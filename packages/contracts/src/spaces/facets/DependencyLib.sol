// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IImplementationRegistry} from "src/factory/facets/registry/IImplementationRegistry.sol";
import {IAppRegistry} from "src/apps/facets/registry/IAppRegistry.sol";

// libraries
import {MembershipStorage} from "src/spaces/facets/membership/MembershipStorage.sol";

// contracts

///@title DependencyLib
///@dev Library for resolving contract dependencies via the Implementation Registry. Used for retrieving the latest implementation addresses for named dependencies within a space.
library DependencyLib {
    // Constants for dependency names
    bytes32 internal constant RIVER_AIRDROP = bytes32("RiverAirdrop");
    bytes32 internal constant SPACE_OPERATOR = bytes32("SpaceOperator"); // BaseRegistry
    bytes32 internal constant SPACE_OWNER = bytes32("Space Owner");
    bytes32 internal constant APP_REGISTRY = bytes32("AppRegistry");

    /// @notice Retrieves the latest implementation address for a given dependency name.
    /// @dev Looks up the dependency in the Implementation Registry associated with the space factory.
    /// @param ms The MembershipStorage layout containing the spaceFactory address.
    /// @param dependencyName The keccak256 hash of the dependency name to resolve.
    /// @return The address of the latest implementation for the specified dependency.
    function getDependency(
        MembershipStorage.Layout storage ms,
        bytes32 dependencyName
    ) internal view returns (address) {
        IImplementationRegistry registry = IImplementationRegistry(ms.spaceFactory);
        return registry.getLatestImplementation(dependencyName);
    }

    ///@notice Retrieves the latest implementation addresses for multiple dependency names.
    ///@dev Batch resolves dependencies using the Implementation Registry associated with the space factory.
    ///@param ms The MembershipStorage layout containing the spaceFactory address.
    ///@param deps An array of keccak256 hashes of dependency names to resolve.
    ///@return An array of addresses corresponding to the latest implementations for each dependency.
    function getDependencies(
        MembershipStorage.Layout storage ms,
        bytes32[] memory deps
    ) internal view returns (address[] memory) {
        uint256 length = deps.length;
        address[] memory dependencies = new address[](length);
        IImplementationRegistry registry = IImplementationRegistry(ms.spaceFactory);
        for (uint256 i; i < length; ++i) {
            dependencies[i] = registry.getLatestImplementation(deps[i]);
        }
        return dependencies;
    }

    /// @notice Retrieves the latest implementation address for the App Registry dependency.
    /// @dev Convenience method to get the App Registry implementation from the registry.
    /// @return The address of the latest App Registry implementation.
    function getAppRegistry() internal view returns (IAppRegistry) {
        return IAppRegistry(getDependency(MembershipStorage.layout(), APP_REGISTRY));
    }
}
