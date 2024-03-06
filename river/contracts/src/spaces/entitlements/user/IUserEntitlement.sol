// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {IEntitlement} from "contracts/src/spaces/entitlements/IEntitlement.sol";

interface IUserEntitlement is IEntitlement {
  // Constructor is not included in interfaces

  // Initialize function, if it's intended to be called externally
  function initialize(address _space) external;

  // Any other external or public functions
  function isEntitled(
    string calldata channelId,
    address[] memory wallets,
    bytes32 permission
  ) external view returns (bool);

  function setEntitlement(
    uint256 roleId,
    bytes calldata entitlementData
  ) external;

  function removeEntitlement(uint256 roleId) external;

  function getEntitlementDataByRoleId(
    uint256 roleId
  ) external view returns (bytes memory);

  // Include any events that the interface should expose
  // event ExampleEvent(address indexed user, uint256 indexed roleId);
}
