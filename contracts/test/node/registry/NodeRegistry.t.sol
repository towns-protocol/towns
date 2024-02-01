// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {INodeRegistryBase} from "contracts/src/node/registry/INodeRegistry.sol";

// libraries

// contracts
import {NodeBaseSetup} from "../NodeBaseSetup.sol";
import {Node} from "contracts/src/node/registry/INodeRegistry.sol";
import {NodeWallets} from "../NodeWallets.sol";

contract NodeRegistryTest is NodeBaseSetup, INodeRegistryBase, NodeWallets {
  string internal constant SOME_SOCKET = "65.109.205.53:32005;32004";

  function testGetNodeRevertsIfNotRegistered() external {
    address validator = _randomAddress();
    vm.expectRevert(NodeRegistry__NotRegistered.selector);
    nodeRegistryFacet.getNode(validator);
  }

  function test_registerNode() external {
    address operator = _randomAddress();
    vm.startPrank(operator);
    nodeOperatorFacet.registerOperator(operator);

    RegisterNode memory payload = RegisterNode(
      wallet1.addr,
      operator,
      wallet1.publicKey,
      SOME_SOCKET
    );

    bytes32 digest = nodeRegistryFacet.getRegisterNodeDigest(payload);
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(wallet1.privateKey, digest);
    nodeRegistryFacet.registerNode(payload, v, r, s);

    Node memory node = nodeRegistryFacet.getNode(wallet1.addr);
    assertEq(node.operator, operator);
    assertEq(node.publicKey, wallet1.publicKey);
    assertEq(node.socket, SOME_SOCKET);
  }

  function testSameNodeShouldNotBeRegisteredTwice() external {
    address operator = _randomAddress();
    vm.startPrank(operator);
    nodeOperatorFacet.registerOperator(operator);
    RegisterNode memory payload = RegisterNode(
      wallet1.addr,
      operator,
      wallet1.publicKey,
      SOME_SOCKET
    );
    bytes32 digest = nodeRegistryFacet.getRegisterNodeDigest(payload);
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(wallet1.privateKey, digest);
    nodeRegistryFacet.registerNode(payload, v, r, s);

    vm.expectRevert(NodeRegistry__AlreadyRegistered.selector);
    nodeRegistryFacet.registerNode(payload, v, r, s);
  }

  function testSenderShouldBeOperator() external {
    address operator = _randomAddress();
    vm.startPrank(operator);
    nodeOperatorFacet.registerOperator(operator);
    RegisterNode memory payload = RegisterNode(
      wallet1.addr,
      operator,
      wallet1.publicKey,
      SOME_SOCKET
    );
    bytes32 digest = nodeRegistryFacet.getRegisterNodeDigest(payload);
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(wallet1.privateKey, digest);
    vm.stopPrank(); // after this line, the sender is no longer the operator.

    vm.expectRevert(NodeRegistry__OnlyOperator.selector);
    nodeRegistryFacet.registerNode(payload, v, r, s);
  }

  function testOperatorShouldBeAllowedToUpdateNode() external {
    address operator = _randomAddress();
    vm.startPrank(operator);
    nodeOperatorFacet.registerOperator(operator);
    RegisterNode memory payload = RegisterNode(
      wallet1.addr,
      operator,
      wallet1.publicKey,
      SOME_SOCKET
    );
    bytes32 digest = nodeRegistryFacet.getRegisterNodeDigest(payload);
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(wallet1.privateKey, digest);
    nodeRegistryFacet.registerNode(payload, v, r, s);

    string memory someOtherSocket = "65.109.205.58:32005;32004";

    nodeRegistryFacet.updateNode(wallet1.addr, someOtherSocket);

    Node memory node = nodeRegistryFacet.getNode(wallet1.addr);
    assertEq(node.operator, operator);
    assertEq(node.publicKey, wallet1.publicKey);
    assertEq(node.socket, someOtherSocket);
  }

  function testNonOperatorsShouldNotBeAllowedToUpdateNode() external {
    address operator = _randomAddress();
    vm.startPrank(operator);
    nodeOperatorFacet.registerOperator(operator);
    RegisterNode memory payload = RegisterNode(
      wallet1.addr,
      operator,
      wallet1.publicKey,
      SOME_SOCKET
    );
    bytes32 digest = nodeRegistryFacet.getRegisterNodeDigest(payload);
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(wallet1.privateKey, digest);
    nodeRegistryFacet.registerNode(payload, v, r, s);

    string memory someOtherSocket = "65.109.205.58:32005;32004";

    vm.stopPrank(); // after this line, the sender is no longer the operator.
    vm.expectRevert(NodeRegistry__OnlyOperator.selector);
    nodeRegistryFacet.updateNode(wallet1.addr, someOtherSocket);

    Node memory node = nodeRegistryFacet.getNode(wallet1.addr);
    assertEq(node.operator, operator);
    assertEq(node.publicKey, wallet1.publicKey);
    assertEq(node.socket, SOME_SOCKET);
  }
}
