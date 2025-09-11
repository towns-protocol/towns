// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {AlphaHelper} from "scripts/interactions/helpers/AlphaHelper.sol";

import {DeployRiverRegistry} from "scripts/deployments/diamonds/DeployRiverRegistry.s.sol";

contract InteractRiverAlpha is AlphaHelper {
    DeployRiverRegistry deployRiverRegistry = new DeployRiverRegistry();

    function __interact(address deployer) internal override {
        address riverRegistry = getDeployment("riverRegistry");

        executeDiamondCutsWithLogging(
            deployer,
            riverRegistry,
            "RiverRegistry",
            deployRiverRegistry
        );
    }
}
