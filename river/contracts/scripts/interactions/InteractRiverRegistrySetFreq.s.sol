// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interfaces
import {IRiverConfig} from "contracts/src/river/registry/facets/config/IRiverConfig.sol";

// libraries

// contracts
import {Interaction} from "contracts/scripts/common/Interaction.s.sol";

contract InteractRiverRegistrySetFreq is Interaction {
  function __interact(address deployer) internal override {
    address riverRegistry = getDeployment("riverRegistry");

    uint64 value = 10;

    vm.startBroadcast(deployer);
    IRiverConfig(riverRegistry).setConfiguration(
      keccak256("stream.miniblockregistrationfrequency"),
      0,
      abi.encode(value)
    );
    vm.stopBroadcast();
  }
}
