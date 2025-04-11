// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Interaction} from "../common/Interaction.s.sol";
import {ISpaceOwner} from "src/spaces/facets/owner/ISpaceOwner.sol";
import {LibString} from "solady/utils/LibString.sol";

contract InteractSetDefaultUriLocalhost is Interaction {
    string internal constant URI = "http://localhost:3002/";

    function __interact(address deployer) internal override {
        address spaceOwner = getDeployment("spaceOwner");

        vm.broadcast(deployer);
        ISpaceOwner(spaceOwner).setDefaultUri(URI);

        require(LibString.eq(ISpaceOwner(spaceOwner).getDefaultUri(), URI));
    }
}
