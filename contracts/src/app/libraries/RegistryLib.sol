// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

/**
 * @title Registry
 * @notice Library containing core data structures for the app registry
 * @dev Defines the data models used for storing app information
 */
library Registry {
  /**
   * @notice Enum representing possible app statuses
   * @dev Controls the lifecycle state of an app
   * @param Pending Initial state or under review
   * @param Approved App is approved and operational
   * @param Disabled App is no longer active or has been rejected
   */
  enum Status {
    Pending,
    Approved,
    Disabled
  }

  struct Permission {
    bytes32 currentHash;
    uint256 count;
  }

  struct Metadata {
    address implementation;
    uint256 registered;
    uint256 lastUpdated;
  }

  struct App {
    uint256 version;
    address owner;
    address space;
    Status status;
    Permission permission;
    Metadata metadata;
  }

  function initialize(
    App storage app,
    address implementation,
    address owner,
    address space,
    string[] memory permissions
  ) internal {
    app.version = 1;
    app.owner = owner;
    app.space = space;
    app.status = Status.Pending;
    app.metadata.registered = block.timestamp;
    app.metadata.lastUpdated = block.timestamp;
    app.metadata.implementation = implementation;
    app.permission.count = permissions.length;
    app.permission.currentHash = _hashPermissions(permissions);
  }

  function _hashPermissions(
    string[] memory permissions
  ) internal pure returns (bytes32) {
    return keccak256(abi.encodePacked(keccak256(abi.encode(permissions))));
  }
}
