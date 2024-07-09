// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;
// interfaces
import {IOwnableBase} from "contracts/src/diamond/facets/ownable/IERC173.sol";
// structs
// libraries
// contracts
// deployments
import {RiverRegistryBaseSetup} from "contracts/test/river/registry/RiverRegistryBaseSetup.t.sol";

contract StreamRegistryTest is RiverRegistryBaseSetup, IOwnableBase {
  string url1 = "https://node1.com";
  string url2 = "https://node2.com";

  // =============================================================
  //                        allocateStream
  // =============================================================

  function test_streamCount(
    address nodeOperator,
    address node1,
    address node2
  )
    external
    givenNodeOperatorIsApproved(nodeOperator)
    givenNodeIsRegistered(nodeOperator, node1, url1)
    givenNodeIsRegistered(nodeOperator, node2, url2)
  {
    address[] memory nodes = new address[](1);
    nodes[0] = node1;
    bytes memory genesisMiniblock = abi.encodePacked("genesisMiniblock");
    bytes32 streamIdOne = 0x0000000000000000000000000000000000000000000000000000000000000001;
    bytes32 streamIdTwo = 0x0000000000000000000000000000000000000000000000000000000000000002;
    bytes32 genesisMiniblockHash = 0;

    assertEq(streamRegistry.getStreamCount(), 0);

    vm.prank(node1);
    streamRegistry.allocateStream(
      streamIdOne,
      nodes,
      genesisMiniblockHash,
      genesisMiniblock
    );

    assertEq(streamRegistry.getStreamCount(), 1);

    nodes[0] = node2;

    vm.prank(node2);
    streamRegistry.allocateStream(
      streamIdTwo,
      nodes,
      genesisMiniblockHash,
      genesisMiniblock
    );

    assertEq(streamRegistry.getStreamCount(), 2);
  }

  function test_streamCountOnNode(
    address nodeOperator,
    address node
  )
    external
    givenNodeOperatorIsApproved(nodeOperator)
    givenNodeIsRegistered(nodeOperator, node, url1)
  {
    address[] memory nodes = new address[](1);
    nodes[0] = node;
    bytes memory genesisMiniblock = abi.encodePacked("genesisMiniblock");
    bytes32 streamIdOne = 0x0000000000000000000000000000000000000000000000000000000000000001;
    bytes32 streamIdTwo = 0x0000000000000000000000000000000000000000000000000000000000000002;
    bytes32 genesisMiniblockHash = 0;

    assertEq(streamRegistry.getStreamCountOnNode(node), 0);

    vm.prank(node);
    streamRegistry.allocateStream(
      streamIdOne,
      nodes,
      genesisMiniblockHash,
      genesisMiniblock
    );

    assertEq(streamRegistry.getStreamCountOnNode(node), 1);

    vm.prank(node);
    streamRegistry.allocateStream(
      streamIdTwo,
      nodes,
      genesisMiniblockHash,
      genesisMiniblock
    );

    assertEq(streamRegistry.getStreamCountOnNode(node), 2);
  }
}
