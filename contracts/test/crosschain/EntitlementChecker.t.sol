// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Strings} from "openzeppelin-contracts/contracts/utils/Strings.sol";

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import "forge-std/console2.sol";

import {EntitlementChecker} from "contracts/src/crosschain/EntitlementChecker.sol";
import {IEntitlementChecker} from "contracts/src/crosschain/IEntitlementChecker.sol";
import {IEntitlementCheckerEvents} from "contracts/src/crosschain/IEntitlementCheckerEvents.sol";
import {IEntitlementGated} from "contracts/src/crosschain/IEntitlementGated.sol";
import {EntitlementGatedExample} from "contracts/src/crosschain/example/EntitlementGatedExample.sol";

contract EntitlementCheckerTest is Test, IEntitlementCheckerEvents {
  using Strings for uint256;
  mapping(address => string) public nodeKeys;

  function _registerNodes() private {
    for (uint256 i = 0; i < 25; i++) {
      (address node, ) = makeAddrAndKey(
        string(abi.encodePacked("node", i.toString()))
      );
      nodeKeys[node] = string(abi.encodePacked("node", i.toString()));
      //address node = vm.addr(key);
      vm.startPrank(node);
      checker.registerNode();
      vm.stopPrank();
    }
    uint256 len = checker.nodeCount();
    console2.log("_registerNodes nodeCount", len);
    assertEq(len, 25);
  }

  function _unregisterNodes() private {
    for (uint256 i = 0; i < 25; i++) {
      (address node, ) = makeAddrAndKey(
        string(abi.encodePacked("node", i.toString()))
      );
      vm.startPrank(node);
      checker.unregisterNode();
      vm.stopPrank();
      delete nodeKeys[node];
    }

    uint256 len = checker.nodeCount();
    assertEq(len, 0);
  }

  function _voteOnTransaction(NodeVoteStatus vote) private returns (bytes32) {
    vm.recordLogs();
    console2.log("_voteOnTransaction calling emit EntitlementCheckRequested");
    gated.requestEntitlementCheck();
    console2.log("_voteOnTransaction");
    bytes32 transactionId;
    Vm.Log[] memory entries = vm.getRecordedLogs();
    for (uint256 i = 0; i < entries.length; ++i) {
      assertEq(entries[i].topics.length, 2);
      assertEq(
        entries[i].topics[0],
        keccak256(
          "EntitlementCheckRequested(address,bytes32,address[],address)"
        )
      );
      console2.log("topics[2] found", i);

      address callerAddress = address(uint160(uint256(entries[i].topics[1])));

      (
        bytes32 transactionId2,
        address[] memory nodeAddress,
        address originAddress
      ) = abi.decode(entries[i].data, (bytes32, address[], address));

      transactionId = transactionId2;

      console2.log("callerAddress", callerAddress);
      console2.log("originAddress", originAddress);
      bool emitted = false;

      for (uint256 j = 0; j < nodeAddress.length; ++j) {
        console2.log("vote", i, j);
        vm.startPrank(nodeAddress[j]);
        if (j + 1 > nodeAddress.length / 2 && !emitted) {
          emitted = true;
          vm.expectEmit(true, false, false, true);
          emit EntitlementCheckResultPosted(transactionId, vote);
          console2.log("expecting vote emited", i, j);
        }
        gated.postEntitlementCheckResult(transactionId, vote);
        vm.stopPrank();
      }
      console2.log("after vote", i);
    }
    console2.log("after vote loop");
    return transactionId;
  }

  IEntitlementChecker public checker;
  IEntitlementGated public gated;

  function setUp() public {}

  function testRegisterAndUnregister() public {
    checker = new EntitlementChecker();
    gated = new EntitlementGatedExample(checker);

    _registerNodes();
    {
      (address node, ) = makeAddrAndKey(string(abi.encodePacked("node", "0")));
      //address node = vm.addr(key);
      vm.startPrank(node);
      vm.expectRevert(bytes("Node already registered"));
      checker.registerNode();
      vm.stopPrank();
    }

    _unregisterNodes();

    {
      (address node, ) = makeAddrAndKey(string(abi.encodePacked("node", "0")));
      //address node = vm.addr(key);
      vm.startPrank(node);
      vm.expectRevert(bytes("Node does not exist"));
      checker.unregisterNode();
      vm.stopPrank();
    }
  }

  function testRequestEntitlementCheckEmits() public {
    checker = new EntitlementChecker();
    gated = new EntitlementGatedExample(checker);

    _registerNodes();
    address[] memory selectedNodes = checker.getRandomNodes(5, address(gated));
    vm.expectEmit();
    bytes32 transactionId = keccak256(
      abi.encodePacked(tx.origin, block.number)
    );
    emit IEntitlementCheckerEvents.EntitlementCheckRequested(
      tx.origin,
      transactionId,
      selectedNodes,
      address(gated)
    );
    console2.log("emit EntitlementCheckRequested");
    gated.requestEntitlementCheck();
    _unregisterNodes();
  }

  function testRequestGetRandomNodes() public {
    checker = new EntitlementChecker();
    gated = new EntitlementGatedExample(checker);

    _registerNodes();
    address[] memory randomeNodes = checker.getRandomNodes(5, address(gated));
    assertEq(randomeNodes.length, 5);
    _unregisterNodes();
  }

  function testRequestEntitlementCheckFailsOnDoubleCall() public {
    checker = new EntitlementChecker();
    gated = new EntitlementGatedExample(checker);

    _registerNodes();
    gated.requestEntitlementCheck();
    vm.expectRevert(bytes("Transaction already registered"));
    gated.requestEntitlementCheck();
    _unregisterNodes();
  }

  function testPostEntitlementResult() public {
    checker = new EntitlementChecker();
    gated = new EntitlementGatedExample(checker);

    _registerNodes();
    console2.log("transactionId1 going to call vote");

    bytes32 transactionId1 = _voteOnTransaction(NodeVoteStatus.PASSED);
    console2.log("transactionId1");
    gated.deleteTransaction(transactionId1);
    bytes32 transactionId2 = _voteOnTransaction(NodeVoteStatus.FAILED);
    console2.log("transactionId2");
    gated.deleteTransaction(transactionId2);
    _unregisterNodes();
  }

  function testPostInvalidEntitlementResult() public {
    checker = new EntitlementChecker();
    gated = new EntitlementGatedExample(checker);

    _registerNodes();
    vm.recordLogs();
    gated.requestEntitlementCheck();
    Vm.Log[] memory entries = vm.getRecordedLogs();
    bytes32 transactionId;
    for (uint256 i = 0; i < entries.length; ++i) {
      assertEq(entries[i].topics.length, 2);
      assertEq(
        entries[i].topics[0],
        keccak256(
          "EntitlementCheckRequested(address,bytes32,address[],address)"
        )
      );
      console2.log("topics[1] found");

      (
        bytes32 transactionId2,
        address[] memory nodeAddress,
        address originAddress
      ) = abi.decode(entries[i].data, (bytes32, address[], address));

      transactionId = transactionId2;

      address callerAddress = address(uint160(uint256(entries[i].topics[1])));

      console2.log("callerAddress", callerAddress);
      console2.log("originAddress", originAddress);

      for (uint256 j = 0; j < nodeAddress.length; ++j) {
        console2.log("vote", i, j);

        vm.startPrank(nodeAddress[j]);
        vm.expectRevert("Invalid vote");
        gated.postEntitlementCheckResult(
          transactionId,
          NodeVoteStatus.NOT_VOTED
        );
        vm.stopPrank();
      }
    }
    gated.deleteTransaction(transactionId);
    _unregisterNodes();
  }

  function testPostDuplicateEntitlementResult() public {
    checker = new EntitlementChecker();
    gated = new EntitlementGatedExample(checker);

    _registerNodes();
    vm.recordLogs();
    gated.requestEntitlementCheck();
    bytes32 transactionId;
    Vm.Log[] memory entries = vm.getRecordedLogs();
    for (uint256 i = 0; i < entries.length; ++i) {
      assertEq(entries[i].topics.length, 2);
      console2.log("entries[i].topics[0] found");
      assertEq(
        entries[i].topics[0],
        keccak256(
          "EntitlementCheckRequested(address,bytes32,address[],address)"
        )
      );
      console2.log("topics[1] found");
      address callerAddress = address(uint160(uint256(entries[i].topics[1])));
      console2.log("topics[2] found");
      (
        bytes32 transactionId2,
        address[] memory nodeAddress,
        address origin
      ) = abi.decode(entries[i].data, (bytes32, address[], address));
      transactionId = transactionId2;
      console2.log("callerAddress", callerAddress);
      console2.log("origin", origin);

      for (uint256 j = 0; j < nodeAddress.length; ++j) {
        vm.startPrank(nodeAddress[j]);
        gated.postEntitlementCheckResult(transactionId, NodeVoteStatus.PASSED);
        vm.expectRevert("Node already voted");
        gated.postEntitlementCheckResult(transactionId, NodeVoteStatus.FAILED);
        vm.stopPrank();
      }
    }
    gated.deleteTransaction(transactionId);
    _unregisterNodes();
  }

  function testPostNonExistantEntitlementResult() public {
    checker = new EntitlementChecker();
    gated = new EntitlementGatedExample(checker);

    _registerNodes();
    vm.recordLogs();
    bytes32 transactionId = bytes32("0x01");
    (address node, ) = makeAddrAndKey(string(abi.encodePacked("node", "0")));
    vm.startPrank(node);
    vm.expectRevert("Transaction not registered");
    gated.postEntitlementCheckResult(transactionId, NodeVoteStatus.FAILED);
    vm.stopPrank();
    vm.expectRevert("Transaction does not exist");
    gated.deleteTransaction(transactionId);
    _unregisterNodes();
  }

  function testPostEntitlementResultFromNonElectedNode() public {
    checker = new EntitlementChecker();
    gated = new EntitlementGatedExample(checker);

    _registerNodes();
    vm.recordLogs();
    bytes32 transactionId;
    gated.requestEntitlementCheck();

    Vm.Log[] memory entries = vm.getRecordedLogs();
    for (uint256 i = 0; i < entries.length; ++i) {
      assertEq(entries[i].topics.length, 2);
      assertEq(
        entries[i].topics[0],
        keccak256(
          "EntitlementCheckRequested(address,bytes32,address[],address)"
        )
      );
      console2.log("topics[1] found");
      (
        bytes32 transactionId2,
        address[] memory _nodeAddress,
        address _origin
      ) = abi.decode(entries[i].data, (bytes32, address[], address));
      transactionId = transactionId2;
    }

    (address node, ) = makeAddrAndKey(
      string(abi.encodePacked("node", "BOGUS"))
    );

    vm.startPrank(node);
    vm.expectRevert("postEntitlementCheckResult Node not found");
    gated.postEntitlementCheckResult(transactionId, NodeVoteStatus.PASSED);
    gated.deleteTransaction(transactionId);
    _unregisterNodes();
  }

  function testGetTooManyNodes() public {
    checker = new EntitlementChecker();
    gated = new EntitlementGatedExample(checker);

    _registerNodes();
    vm.expectRevert("Insufficient number of Nodes");
    checker.getRandomNodes(100, address(gated));
    _unregisterNodes();
  }
}
