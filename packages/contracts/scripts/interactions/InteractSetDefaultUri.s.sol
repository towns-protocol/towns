// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Interaction} from "../common/Interaction.s.sol";
import {ISpaceOwner} from "src/spaces/facets/owner/ISpaceOwner.sol";
import {LibString} from "solady/utils/LibString.sol";

contract InteractSetDefaultUri is Interaction {
    string internal constant URI = "https://alpha.river.delivery/";

    function __interact(address deployer) internal override {
        // vm.setEnv("DEPLOYMENT_CONTEXT", "alpha");
        address spaceOwner = getDeployment("spaceOwner");

        vm.broadcast(deployer);
        ISpaceOwner(spaceOwner).setDefaultUri(URI);

        require(LibString.eq(ISpaceOwner(spaceOwner).getDefaultUri(), URI));
    }
}
