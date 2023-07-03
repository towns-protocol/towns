//SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

library Events {
  event SpaceCreated(
    address indexed spaceAddress,
    address indexed ownerAddress,
    string networkId
  );

  event RoleCreated(
    address indexed caller,
    uint256 indexed roleId,
    string roleName,
    string networkId
  );

  event RoleUpdated(
    address indexed caller,
    uint256 indexed roleId,
    string roleName,
    string networkId
  );

  event RoleRemoved(
    address indexed caller,
    uint256 indexed roleId,
    string networkId
  );
}
