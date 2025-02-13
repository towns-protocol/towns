// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IArchitectBase} from "contracts/src/factory/facets/architect/IArchitect.sol";

// libraries

// contracts

interface ICreateSpace is IArchitectBase {
  /// @notice Creates a new space with basic configuration
  /// @param SpaceInfo Struct containing space metadata, membership settings, and channel configuration
  /// @return address The address of the newly created space contract
  function createSpace(SpaceInfo memory SpaceInfo) external returns (address);

  /// @notice Creates a new space with prepaid memberships
  /// @param createSpace Struct containing space metadata, membership settings, channel config and prepay info
  /// @return address The address of the newly created space contract
  /// @dev The msg.value must cover the cost of prepaid memberships
  function createSpaceWithPrepay(
    CreateSpace memory createSpace
  ) external payable returns (address);

  /// @notice Creates a new space with prepaid memberships and custom deployment options
  /// @param createSpace Struct containing space metadata, membership settings, channel config and prepay info
  /// @param options Struct containing deployment options like the recipient address
  /// @return address The address of the newly created space contract
  /// @dev The msg.value must cover the cost of prepaid memberships
  function createSpaceV2(
    CreateSpace memory createSpace,
    SpaceOptions memory options
  ) external payable returns (address);

  /// @notice Legacy function for backwards compatibility with older space creation format
  /// @param spaceInfo Struct containing old format space configuration
  /// @return address The address of the newly created space contract
  /// @dev This function converts the old format to the new format internally
  /// @dev The msg.value must cover the cost of prepaid memberships
  function createSpaceWithPrepay(
    CreateSpaceOld memory spaceInfo
  ) external payable returns (address);
}
