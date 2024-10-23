// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Vm} from "forge-std/Vm.sol";

abstract contract EntitlementTestUtils {
  bytes32 internal constant CHECK_REQUESTED =
    keccak256(
      "EntitlementCheckRequested(address,address,bytes32,uint256,address[])"
    );

  /// @dev Capture the requested entitlement data from the logs emitted by the EntitlementChecker
  function _getRequestedEntitlementData(
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
}
