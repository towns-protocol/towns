// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IArchitectBase} from "../architect/IArchitect.sol";

interface ICreateSpaceBase {
    /// @notice Action enum for unified space creation dispatch
    /// @dev To encode data for each action:
    ///   switch (action) {
    ///     case Action.CreateBasic:
    ///       data = abi.encode(SpaceInfo memory spaceInfo);
    ///     case Action.CreateWithPrepay:
    ///       data = abi.encode(CreateSpace memory spaceInfo);
    ///     case Action.CreateWithOptions:
    ///       data = abi.encode(CreateSpace memory spaceInfo, SpaceOptions memory options);
    ///     case Action.CreateLegacy:
    ///       data = abi.encode(CreateSpaceOld memory spaceInfo);
    ///   }
    enum Action {
        CreateBasic, // Basic space creation with SpaceInfo struct
        CreateWithPrepay, // Space creation with prepaid memberships
        CreateWithOptions, // Space creation with custom deployment options
        CreateLegacy // Legacy space creation for backward compatibility
    }

    error CreateSpaceFacet__InvalidAction();
}

interface ICreateSpace is IArchitectBase, ICreateSpaceBase {
    /// @notice Unified entry point for creating spaces with different configurations
    /// @param action The type of space creation to perform
    /// @param data ABI-encoded data for the specific action type
    /// @return address The address of the newly created space contract
    function createSpace(Action action, bytes calldata data) external payable returns (address);

    /// @notice Creates a new space with basic configuration
    /// @param SpaceInfo Struct containing space metadata, membership settings, and channel
    /// configuration
    /// @return address The address of the newly created space contract
    function createSpace(SpaceInfo calldata SpaceInfo) external returns (address);

    /// @notice Creates a new space with prepaid memberships
    /// @param createSpace Struct containing space metadata, membership settings, channel config and
    /// prepay info
    /// @return address The address of the newly created space contract
    /// @dev The msg.value must cover the cost of prepaid memberships
    function createSpaceWithPrepay(
        CreateSpace calldata createSpace
    ) external payable returns (address);

    /// @notice Creates a new space with prepaid memberships and custom deployment options
    /// @param createSpace Struct containing space metadata, membership settings, channel config and
    /// prepay info
    /// @param options Struct containing deployment options like the recipient address
    /// @return address The address of the newly created space contract
    /// @dev The msg.value must cover the cost of prepaid memberships
    function createSpaceV2(
        CreateSpace calldata createSpace,
        SpaceOptions calldata options
    ) external payable returns (address);

    /// @notice Legacy function for backwards compatibility with older space creation format
    /// @param spaceInfo Struct containing old format space configuration
    /// @return address The address of the newly created space contract
    /// @dev This function converts the old format to the new format internally
    /// @dev The msg.value must cover the cost of prepaid memberships
    function createSpaceWithPrepay(
        CreateSpaceOld calldata spaceInfo
    ) external payable returns (address);

    /// @notice Returns the address of the SpaceProxyInitializer contract
    /// @return The deterministic CREATE2 address of the SpaceProxyInitializer
    /// @dev The initializer is deployed on first space creation if not already deployed
    function getProxyInitializer() external view returns (address);
}
