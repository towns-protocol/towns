// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC173} from "contracts/src/diamond/facets/ownable/IERC173.sol";

// libraries

// contracts
import {Interaction} from "../common/Interaction.s.sol";

contract InteractTransferOwnership is Interaction {
  function __interact(address deployer) public override {
    address registry = getDeployment("space");
    address newOwner = 0x63217D4c321CC02Ed306cB3843309184D347667B;

    vm.startBroadcast(deployer);
    IERC173(registry).transferOwnership(newOwner);
    vm.stopBroadcast();
  }
}
