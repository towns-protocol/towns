// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

// interfaces

// libraries

// contracts

interface ISpaceUpgrades {
  error InvalidInterface();
  error NotSpaceOwner();
  error NotEntitled();
  error SpaceAlreadyRegistered();
  error SpaceNotRegistered();
  error SpaceAlreadyUpgraded();
  error UpgradeNotAllowed();
  error InvalidDelayPeriod();
  error InvalidSpaceFactoryAddress();

  struct UpgradeInfo {
    address space;
    address implementation;
  }

  function register(address space, address implementation) external;
}
