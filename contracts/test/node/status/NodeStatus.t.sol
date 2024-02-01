// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {INodeStatusBase} from "contracts/src/node/status/INodeStatus.sol";
import {NodeWallets} from "../NodeWallets.sol";
import {INodeRegistryBase, Node} from "contracts/src/node/registry/INodeRegistry.sol";

import {NodeBaseSetup} from "../NodeBaseSetup.sol";

contract NodeStatusTest is
  INodeRegistryBase,
  INodeStatusBase,
  NodeBaseSetup,
  NodeWallets
{
  bytes4 internal constant SOME_IP_ADDRESS = hex"7f000001";
  uint16 internal constant SOME_PORT = 54321;
  string internal constant SOME_SOCKET = "65.109.205.53:32005;32004";

  address internal operator1;

  function setUp() public override {
    super.setUp();
    operator1 = _randomAddress();
  }

  function _registerNode() internal {
    vm.startPrank(operator1);
    nodeOperatorFacet.registerOperator(operator1);
    RegisterNode memory payload = RegisterNode(
      wallet1.addr,
      operator1,
      wallet1.publicKey,
      SOME_SOCKET
    );
    bytes32 digest = nodeRegistryFacet.getRegisterNodeDigest(payload);
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(wallet1.privateKey, digest);
    nodeRegistryFacet.registerNode(payload, v, r, s);
    vm.stopPrank();
  }

  function _registerNodeAndAddToAllowlist() internal {
    _registerNode();
    vm.startPrank(deployer);
    accessControlListFacet.addToAllowlist(wallet1.addr);
    vm.stopPrank();
  }

  function testExcludedNodeStatusForUnrecognizedValidator() external {
    assertEq(
      uint256(serviceStatusFacet.getStatus(wallet1.addr)),
      uint256(NodeStatus.EXCLUDED)
    );
  }

  function testExcludedNodeStatusForAllowlistedButNotRegisteredValidator()
    external
  {
    vm.startPrank(deployer);
    accessControlListFacet.addToAllowlist(wallet1.addr);
    vm.stopPrank();
    assertEq(
      uint256(serviceStatusFacet.getStatus(wallet1.addr)),
      uint256(NodeStatus.EXCLUDED)
    );
  }

  function testExcludedNodeStatusForRegisteredValidator() external {
    _registerNode();
    assertEq(
      uint256(serviceStatusFacet.getStatus(wallet1.addr)),
      uint256(NodeStatus.EXCLUDED)
    );
  }

  function testDormantNodeStatusForRegisteredValidator() external {
    _registerNode();
    vm.startPrank(deployer);
    accessControlListFacet.addToAllowlist(wallet1.addr);
    vm.stopPrank();
    assertEq(
      uint256(serviceStatusFacet.getStatus(wallet1.addr)),
      uint256(NodeStatus.DORMANT)
    );
  }

  function testPendingEntry() external {
    _registerNodeAndAddToAllowlist();
    vm.startPrank(operator1);
    serviceStatusFacet.signalIntentToEnter(wallet1.addr);
    vm.stopPrank();
    assertEq(
      uint256(serviceStatusFacet.getStatus(wallet1.addr)),
      uint256(NodeStatus.PENDING_ENTRY)
    );
  }

  function testPendingEntryBeforeDeadline() external {
    _registerNodeAndAddToAllowlist();
    vm.startPrank(operator1);
    serviceStatusFacet.signalIntentToEnter(wallet1.addr);
    vm.stopPrank();
    vm.warp(block.number + 256);
    assertEq(
      uint256(serviceStatusFacet.getStatus(wallet1.addr)),
      uint256(NodeStatus.PENDING_ENTRY)
    );
  }

  function testFailedEntry() external {
    _registerNodeAndAddToAllowlist();
    vm.startPrank(operator1);
    serviceStatusFacet.signalIntentToEnter(wallet1.addr);
    vm.stopPrank();
    vm.warp(block.number + 256 + 1);
    assertEq(
      uint256(serviceStatusFacet.getStatus(wallet1.addr)),
      uint256(NodeStatus.FAILED_ENTRY)
    );
  }

  function testPendingActive() external {
    _registerNodeAndAddToAllowlist();
    vm.startPrank(operator1);
    serviceStatusFacet.signalIntentToEnter(wallet1.addr);
    vm.warp(block.number + 1);
    serviceStatusFacet.signalIntentToActivate(wallet1.addr);
    vm.stopPrank();

    assertEq(
      uint256(serviceStatusFacet.getStatus(wallet1.addr)),
      uint256(NodeStatus.PENDING_ACTIVE)
    );
  }

  // TODO: fix this test
  // function testActive() external {
  //   _registerNodeAndAddToAllowlist();
  //   vm.startPrank(operator1);
  //   serviceStatusFacet.signalIntentToEnter(wallet1.addr);
  //   vm.warp(block.number + 1);
  //   serviceStatusFacet.signalIntentToActivate(wallet1.addr);
  //   vm.warp(block.number + 256 + 256 + 10_000);
  //   vm.stopPrank();

  //   assertEq(
  //     uint256(serviceStatusFacet.getStatus(wallet1.addr)),
  //     uint256(NodeStatus.ACTIVE)
  //   );
  // }
}
