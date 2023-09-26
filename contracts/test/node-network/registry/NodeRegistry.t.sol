// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts
import {NodeRegistrySetup} from "./NodeRegistrySetup.sol";
import {Errors} from "contracts/src/node-network/registry/Errors.sol";
import {RegisterNode, Node} from "contracts/src/node-network/registry/INodeRegistry.sol";
import {Wallets} from "../helpers/Wallets.sol";

contract NodeRegistryTest is NodeRegistrySetup, Wallets {
  bytes4 internal constant SOME_IP_ADDRESS = hex"7f000001";
  uint16 internal constant SOME_PORT = 54321;

  function testGetNodeRevertsIfNotRegistered() external {
    address validator = _randomAddress();
    vm.expectRevert(Errors.NotRegistered.selector);
    nodeRegistryFacet.getNode(validator);
  }

  function testSuccessfulNodeRegistration() external {
    address operator = _randomAddress();
    vm.startPrank(operator);
    RegisterNode memory payload = RegisterNode(
      wallet1.addr,
      operator,
      wallet1.publicKey,
      SOME_IP_ADDRESS,
      SOME_PORT
    );
    bytes32 digest = nodeRegistryFacet.getRegisterNodeDigest(payload);
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(wallet1.privateKey, digest);
    nodeRegistryFacet.registerNode(payload, v, r, s);

    Node memory node = nodeRegistryFacet.getNode(wallet1.addr);
    assertEq(node.operator, operator);
    assertEq(node.publicKey, wallet1.publicKey);
    assertEq(node.ipAddress, SOME_IP_ADDRESS);
    assertEq(node.port, SOME_PORT);
  }

  function testSameNodeShouldNotBeRegisteredTwice() external {
    address operator = _randomAddress();
    vm.startPrank(operator);
    RegisterNode memory payload = RegisterNode(
      wallet1.addr,
      operator,
      wallet1.publicKey,
      SOME_IP_ADDRESS,
      SOME_PORT
    );
    bytes32 digest = nodeRegistryFacet.getRegisterNodeDigest(payload);
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(wallet1.privateKey, digest);
    nodeRegistryFacet.registerNode(payload, v, r, s);

    vm.expectRevert(Errors.AlreadyRegistered.selector);
    nodeRegistryFacet.registerNode(payload, v, r, s);
  }

  function testSenderShouldBeOperator() external {
    address operator = _randomAddress();
    vm.startPrank(operator);
    RegisterNode memory payload = RegisterNode(
      wallet1.addr,
      operator,
      wallet1.publicKey,
      SOME_IP_ADDRESS,
      SOME_PORT
    );
    bytes32 digest = nodeRegistryFacet.getRegisterNodeDigest(payload);
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(wallet1.privateKey, digest);
    vm.stopPrank(); // after this line, the sender is no longer the operator.

    vm.expectRevert(Errors.OnlyOperator.selector);
    nodeRegistryFacet.registerNode(payload, v, r, s);
  }

  function testOperatorShouldBeAllowedToUpdateNode() external {
    address operator = _randomAddress();
    vm.startPrank(operator);
    RegisterNode memory payload = RegisterNode(
      wallet1.addr,
      operator,
      wallet1.publicKey,
      SOME_IP_ADDRESS,
      SOME_PORT
    );
    bytes32 digest = nodeRegistryFacet.getRegisterNodeDigest(payload);
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(wallet1.privateKey, digest);
    nodeRegistryFacet.registerNode(payload, v, r, s);

    bytes4 someOtherIpAddress = hex"7f000002"; // 127.0.0.2
    uint16 someOtherPort = 12345;

    nodeRegistryFacet.updateNode(
      wallet1.addr,
      someOtherIpAddress,
      someOtherPort
    );

    Node memory node = nodeRegistryFacet.getNode(wallet1.addr);
    assertEq(node.operator, operator);
    assertEq(node.publicKey, wallet1.publicKey);
    assertEq(node.ipAddress, someOtherIpAddress);
    assertEq(node.port, someOtherPort);
  }

  function testNonOperatorsShouldNotBeAllowedToUpdateNode() external {
    address operator = _randomAddress();
    vm.startPrank(operator);
    RegisterNode memory payload = RegisterNode(
      wallet1.addr,
      operator,
      wallet1.publicKey,
      SOME_IP_ADDRESS,
      SOME_PORT
    );
    bytes32 digest = nodeRegistryFacet.getRegisterNodeDigest(payload);
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(wallet1.privateKey, digest);
    nodeRegistryFacet.registerNode(payload, v, r, s);

    bytes4 someOtherIpAddress = hex"7f000002";
    uint16 someOtherPort = 12345;

    vm.stopPrank(); // after this line, the sender is no longer the operator.
    vm.expectRevert(Errors.OnlyOperator.selector);
    nodeRegistryFacet.updateNode(
      wallet1.addr,
      someOtherIpAddress,
      someOtherPort
    );

    Node memory node = nodeRegistryFacet.getNode(wallet1.addr);
    assertEq(node.operator, operator);
    assertEq(node.publicKey, wallet1.publicKey);
    assertEq(node.ipAddress, SOME_IP_ADDRESS);
    assertEq(node.port, SOME_PORT);
  }
}
