// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

//interfaces

//libraries

//contracts
import {Interaction} from "../common/Interaction.s.sol";
import {PioneerFacet} from "contracts/src/tokens/pioneer/PioneerFacet.sol";

contract InteractPioneer is Interaction {
  function __interact(uint256 deployerPK, address deployer) public override {
    address pioneer = getDeployment("pioneerToken");

    vm.broadcast(deployerPK);
    PioneerFacet(pioneer).mintTo(deployer);
  }
}
