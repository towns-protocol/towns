// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Vm} from "forge-std/Vm.sol";

abstract contract EntitlementTestUtils {
  bytes32 internal constant RESULT_POSTED =
    keccak256("EntitlementCheckResultPosted(bytes32,uint8)");
  bytes32 internal constant TOKEN_EMITTED =
    keccak256("MembershipTokenIssued(address,uint256)");

  bytes32 internal constant CHECK_REQUESTED =
    keccak256(
      "EntitlementCheckRequested(address,address,bytes32,uint256,address[])"
    );

  bytes32 internal constant CHECK_REQUESTED_V2 =
    keccak256(
      "EntitlementCheckRequestedV2(address,address,address,bytes32,uint256,address[])"
    );

  struct EntitlementCheckRequestEvent {
    address walletAddress;
    address spaceAddress;
    address resolverAddress;
    bytes32 transactionId;
    uint256 requestId;
    address[] randomNodes;
  }

  /// @dev Capture the requested entitlement data from the logs emitted by the EntitlementChecker
  function _getRequestV1EventData(
    Vm.Log[] memory requestLogs
  )
    internal
    pure
    returns (
      address contractAddress,
      bytes32 transactionId,
      uint256 roleId,
      address[] memory selectedNodes
    )
  {
    for (uint256 i; i < requestLogs.length; ++i) {
      if (
        requestLogs[i].topics.length > 0 &&
        requestLogs[i].topics[0] == CHECK_REQUESTED
      ) {
        (, contractAddress, transactionId, roleId, selectedNodes) = abi.decode(
          requestLogs[i].data,
          (address, address, bytes32, uint256, address[])
        );
        return (contractAddress, transactionId, roleId, selectedNodes);
      }
    }
    revert("Entitlement check request not found");
  }

  function _getRequestV2EventCount(
    Vm.Log[] memory logs
  ) internal pure returns (uint256 count) {
    for (uint256 i = 0; i < logs.length; i++) {
      if (logs[i].topics[0] == CHECK_REQUESTED_V2) {
        count++;
      }
    }
  }

  function _getRequestV2Events(
    Vm.Log[] memory requestLogs
  ) internal pure returns (EntitlementCheckRequestEvent[] memory) {
    uint256 numRequests = _getRequestV2EventCount(requestLogs);

    EntitlementCheckRequestEvent[]
      memory entitlementCheckRequests = new EntitlementCheckRequestEvent[](
        numRequests
      );
    for (uint256 i; i < requestLogs.length; ++i) {
      address walletAddress;
      address spaceAddress;
      address resolverAddress;
      bytes32 transactionId;
      uint256 roleId;
      address[] memory selectedNodes;

      if (requestLogs[i].topics[0] == CHECK_REQUESTED_V2) {
        (
          walletAddress,
          spaceAddress,
          resolverAddress,
          transactionId,
          roleId,
          selectedNodes
        ) = abi.decode(
          requestLogs[i].data,
          (address, address, address, bytes32, uint256, address[])
        );

        entitlementCheckRequests[i] = EntitlementCheckRequestEvent(
          walletAddress,
          spaceAddress,
          resolverAddress,
          transactionId,
          roleId,
          selectedNodes
        );
      }
    }
    return entitlementCheckRequests;
  }

  function _getRequestV2EventData(
    Vm.Log[] memory requestLogs
  )
    internal
    pure
    returns (
      address walletAddress,
      address spaceAddress,
      address resolverAddress,
      bytes32 transactionId,
      uint256 roleId,
      address[] memory selectedNodes
    )
  {
    for (uint256 i = 0; i < requestLogs.length; i++) {
      if (
        requestLogs[i].topics.length > 0 &&
        requestLogs[i].topics[0] == CHECK_REQUESTED_V2
      ) {
        (
          walletAddress,
          spaceAddress,
          resolverAddress,
          transactionId,
          roleId,
          selectedNodes
        ) = abi.decode(
          requestLogs[i].data,
          (address, address, address, bytes32, uint256, address[])
        );
      }
    }
  }
}
