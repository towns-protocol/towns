// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {Inputs, Registry} from "../types/AppTypes.sol";

// contracts
interface IAppRegistryBase {
  event AppRegistered(
    uint256 indexed appId,
    address indexed app,
    address indexed owner,
    string name,
    string symbol
  );

  event AppUpdated(
    uint256 indexed appId,
    address indexed app,
    address indexed owner,
    string name,
    string symbol
  );

  event AppStatusUpdated(uint256 indexed appId, Registry.Status status);
}

interface IAppRegistry is IAppRegistryBase {
  /**
   * @notice Retrieves the complete registration information for a specific app
   * @dev Returns both the app configuration and its associated permissions
   * @param appId The unique identifier of the app to query
   * @return Registry.Config The app's configuration including metadata and status
   * @return permissions string[] The list of permissions granted to the app
   */
  function getApp(
    uint256 appId
  ) external view returns (Registry.Config memory, string[] memory permissions);

  /**
   * @notice Registers a new application in the registry
   * @dev Creates a new app entry with the provided configuration and permissions
   * @param params The CreateApp struct containing all necessary app information:
   *        - app: Address of the app contract
   *        - status: Initial status of the app (Pending, Active, Disabled)
   *        - owner: Address of the app owner
   *        - metadata: App metadata including URI, name, and symbol
   *        - permissions: Array of permission strings granted to the app
   */
  function createApp(Inputs.CreateApp calldata params) external;

  /**
   * @notice Updates an existing application's configuration
   * @dev Modifies app status, metadata, and/or permissions
   * @param appId The unique identifier of the app to update
   * @param params The UpdateApp struct containing the fields to update:
   *        - status: New status for the app (subject to valid state transitions)
   *        - metadata: Updated metadata including URI, name, and symbol
   *        - permissions: New array of permission strings (replaces existing permissions)
   */
  function updateApp(uint256 appId, Inputs.UpdateApp calldata params) external;
}
