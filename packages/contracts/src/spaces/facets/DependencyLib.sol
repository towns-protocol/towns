// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IImplementationRegistry} from "src/factory/facets/registry/IImplementationRegistry.sol";

// libraries
import {MembershipStorage} from "src/spaces/facets/membership/MembershipStorage.sol";

// contracts

library DependencyLib {
    function getDependency(bytes32 dependencyName) internal view returns (address) {
        address factory = MembershipStorage.layout().spaceFactory;
        IImplementationRegistry registry = IImplementationRegistry(factory);
        return registry.getLatestImplementation(dependencyName);
    }

    function getDependencies(bytes32[] memory deps) internal view returns (address[] memory) {
        address[] memory dependencies = new address[](deps.length);
        address factory = MembershipStorage.layout().spaceFactory;
        IImplementationRegistry registry = IImplementationRegistry(factory);

        for (uint256 i = 0; i < deps.length; i++) {
            dependencies[i] = registry.getLatestImplementation(deps[i]);
        }
        return dependencies;
    }
}
