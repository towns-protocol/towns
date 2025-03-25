// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interfaces
import {IStreamRegistry} from "contracts/src/river/registry/facets/stream/IStreamRegistry.sol";

// libraries

// contracts
import {Interaction} from "contracts/scripts/common/Interaction.s.sol";

contract InteractRiverRegistrySetFreq is Interaction {
  function __interact(address deployer) internal override {
    address riverRegistry = getDeployment("riverRegistry");

    bytes32[] memory streamIds = new bytes32[](2);
    streamIds[
      0
    ] = 0xffca80213974172f672e4b84b789e13490ec2d2313014dfb124b42ef09e1187e;
    streamIds[
      1
    ] = 0x1065e2d2342927a56cf4d6b068336e2691a63f23410000000000000000000000;

    address[] memory nodes = new address[](5);
    nodes[0] = 0xFA731901355D13185B72F9FE41Ff00116e9A5ef8;
    nodes[1] = 0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5;
    nodes[2] = 0x388C818CA8B9251b393131C08a736A67ccB19297;
    nodes[3] = 0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97;
    nodes[4] = 0x73f7b1184B5cD361cC0f7654998953E2a251dd58;

    vm.startBroadcast(deployer);
    IStreamRegistry(riverRegistry).setStreamReplicationFactor(
      streamIds,
      nodes,
      1
    );
    vm.stopBroadcast();
  }
}
