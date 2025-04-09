// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {LogUtils} from "./LogUtils.sol";
import {IEntitlementCheckerBase} from "src/base/registry/facets/checker/IEntitlementChecker.sol";
import {Vm} from "forge-std/Vm.sol";

abstract contract EntitlementTestUtils is IEntitlementCheckerBase, LogUtils {
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
        (, contractAddress, transactionId, roleId, selectedNodes) = abi.decode(
            _getFirstMatchingLog(requestLogs, EntitlementCheckRequested.selector).data,
            (address, address, bytes32, uint256, address[])
        );
    }

    function _getRequestV2EventCount(Vm.Log[] memory logs) internal pure returns (uint256) {
        return _getMatchingLogCount(logs, EntitlementCheckRequestedV2.selector);
    }

    function _getRequestV2Events(
        Vm.Log[] memory requestLogs
    ) internal pure returns (EntitlementCheckRequestEvent[] memory entitlementCheckRequests) {
        Vm.Log[] memory logs = _getMatchingLogs(requestLogs, EntitlementCheckRequestedV2.selector);
        entitlementCheckRequests = new EntitlementCheckRequestEvent[](logs.length);
        for (uint256 i; i < logs.length; ++i) {
            bytes memory data = logs[i].data;
            // in-place abi decoding, or magic
            // similar to: entitlementCheckRequests[i] = abi.decode(data,
            // (EntitlementCheckRequestEvent));
            // except it doesn't work
            EntitlementCheckRequestEvent memory req;
            // memory safe as long as data isn't reused
            assembly ("memory-safe") {
                mstore(0x40, req)
                req := add(data, 0x20)
                mstore(add(req, 0xa0), add(req, 0xc0))
            }
            entitlementCheckRequests[i] = req;
        }
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
        return
            abi.decode(
                _getFirstMatchingLog(requestLogs, EntitlementCheckRequestedV2.selector).data,
                (address, address, address, bytes32, uint256, address[])
            );
    }
}
