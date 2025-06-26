// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IImplementationRegistry} from "src/factory/facets/registry/IImplementationRegistry.sol";

// contracts
import {Interaction} from "scripts/common/Interaction.s.sol";
import {MetadataFacet} from "src/diamond/facets/metadata/MetadataFacet.sol";

contract InteractImplementationRegistry is Interaction {
    function __interact(address deployer) internal override {
        address spaceFactory = getDeployment("spaceFactory");
        address appRegistry = getDeployment("appRegistry");

        bytes32 appRegistryType = MetadataFacet(appRegistry).contractType();
        address latestAppRegistry = IImplementationRegistry(spaceFactory).getLatestImplementation(
            appRegistryType
        );

        if (latestAppRegistry == address(0)) {
            vm.startBroadcast(deployer);
            IImplementationRegistry(spaceFactory).addImplementation(appRegistry);
            vm.stopBroadcast();
        }

        require(
            IImplementationRegistry(spaceFactory).getLatestImplementation(appRegistryType) ==
                appRegistry,
            "appRegistry not found"
        );
    }
}
