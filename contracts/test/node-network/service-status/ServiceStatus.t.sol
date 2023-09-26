// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts
import {ServiceStatusSetup} from "./ServiceStatusSetup.sol";
import {ServiceStatus} from "contracts/src/node-network/service-status/IServiceStatus.sol";
import {Wallets} from "../helpers/Wallets.sol";
import {RegisterNode, Node} from "contracts/src/node-network/registry/INodeRegistry.sol";
import {console2} from "forge-std/console2.sol";
import "forge-std/Test.sol";

contract ServiceStatusTest is ServiceStatusSetup, Wallets {
  bytes4 internal constant SOME_IP_ADDRESS = hex"7f000001";
  uint16 internal constant SOME_PORT = 54321;
  address operator1 = vm.addr(1);

  function _registerNode() internal {
    vm.startPrank(operator1);
    RegisterNode memory payload = RegisterNode(
      wallet1.addr,
      operator1,
      wallet1.publicKey,
      SOME_IP_ADDRESS,
      SOME_PORT
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

  function testExcludedServiceStatusForUnrecognizedValidator() external {
    assertEq(
      uint256(serviceStatusFacet.getServiceStatus(wallet1.addr)),
      uint256(ServiceStatus.EXCLUDED)
    );
  }

  function testExcludedServiceStatusForAllowlistedButNotRegisteredValidator()
    external
  {
    vm.startPrank(deployer);
    accessControlListFacet.addToAllowlist(wallet1.addr);
    vm.stopPrank();
    assertEq(
      uint256(serviceStatusFacet.getServiceStatus(wallet1.addr)),
      uint256(ServiceStatus.EXCLUDED)
    );
  }

  function testExcludedServiceStatusForRegisteredValidator() external {
    _registerNode();
    assertEq(
      uint256(serviceStatusFacet.getServiceStatus(wallet1.addr)),
      uint256(ServiceStatus.EXCLUDED)
    );
  }

  function testDormantServiceStatusForRegisteredValidator() external {
    _registerNode();
    vm.startPrank(deployer);
    accessControlListFacet.addToAllowlist(wallet1.addr);
    vm.stopPrank();
    assertEq(
      uint256(serviceStatusFacet.getServiceStatus(wallet1.addr)),
      uint256(ServiceStatus.DORMANT)
    );
  }

  function testPendingEntry() external {
    _registerNodeAndAddToAllowlist();
    vm.startPrank(operator1);
    serviceStatusFacet.signalIntentToEnter(wallet1.addr);
    vm.stopPrank();
    assertEq(
      uint256(serviceStatusFacet.getServiceStatus(wallet1.addr)),
      uint256(ServiceStatus.PENDING_ENTRY)
    );
  }

  function testPendingEntryBeforeDeadline() external {
    _registerNodeAndAddToAllowlist();
    vm.startPrank(operator1);
    serviceStatusFacet.signalIntentToEnter(wallet1.addr);
    vm.stopPrank();
    vm.warp(block.number + 256);
    assertEq(
      uint256(serviceStatusFacet.getServiceStatus(wallet1.addr)),
      uint256(ServiceStatus.PENDING_ENTRY)
    );
  }

  function testFailedEntry() external {
    _registerNodeAndAddToAllowlist();
    vm.startPrank(operator1);
    serviceStatusFacet.signalIntentToEnter(wallet1.addr);
    vm.stopPrank();
    vm.warp(block.number + 256 + 1);
    assertEq(
      uint256(serviceStatusFacet.getServiceStatus(wallet1.addr)),
      uint256(ServiceStatus.FAILED_ENTRY)
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
      uint256(serviceStatusFacet.getServiceStatus(wallet1.addr)),
      uint256(ServiceStatus.PENDING_ACTIVE)
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
  //     uint256(serviceStatusFacet.getServiceStatus(wallet1.addr)),
  //     uint256(ServiceStatus.ACTIVE)
  //   );
  // }
}
