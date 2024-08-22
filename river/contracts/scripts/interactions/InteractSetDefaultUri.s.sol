// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {LibString} from "solady/utils/LibString.sol";
import {ISpaceOwner} from "contracts/src/spaces/facets/owner/ISpaceOwner.sol";
import {Interaction} from "../common/Interaction.s.sol";

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
