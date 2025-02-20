// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IAppHooks} from "contracts/src/app/interfaces/IAppHooks.sol";
// libraries

// contracts

interface IAppRegistryBase {
  struct Registration {
    address appAddress;
    address owner;
    string uri;
    string name;
    string symbol;
    bool disabled;
    string[] permissions;
    IAppHooks hooks;
  }

  struct UpdateRegistration {
    string uri;
    string[] permissions;
    IAppHooks hooks;
    bool disabled;
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           Events                           */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  event AppRegistered(
    address indexed owner,
    address indexed appAddress,
    uint256 indexed appId,
    Registration registration
  );

  event AppUpdated(
    address indexed owner,
    address indexed appAddress,
    uint256 indexed appId,
    UpdateRegistration registration
  );

  event PermissionStateChanged(
    address indexed changedBy,
    string indexed permission,
    bool enabled
  );

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           Errors                           */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  error AppAlreadyRegistered();
  error AppNotRegistered();
  error AppNotOwnedBySender();
  error AppDisabled();
  error AppPermissionsMissing();
  error AppInvalidPermission();
  error AppTooManyPermissions();
}

interface IAppRegistry is IAppRegistryBase {
  /// @notice Register a new app with the registry
  /// @param registration The registration details for the app
  /// @return appId The unique identifier assigned to the registered app
  function register(
    Registration calldata registration
  ) external returns (uint256 appId);

  /// @notice Check if an app address is registered
  /// @param appAddress The address of the app to check
  /// @return bool True if the app is registered, false otherwise
  function isRegistered(address appAddress) external view returns (bool);

  /// @notice Get the registration details for a registered app
  /// @param appAddress The address of the app to get registration details for
  /// @return Registration The registration details of the app
  /// @dev Reverts with AppNotRegistered if the app is not registered
  function getRegistration(
    address appAddress
  ) external view returns (Registration memory);

  /// @notice Update the registration details for a registered app
  /// @param appId The ID of the app to update
  /// @param registration The new registration details
  /// @dev Only the app owner can update the registration
  /// @dev Reverts with AppNotRegistered if the app is not registered
  /// @dev Reverts with AppNotOwnedBySender if caller is not the app owner
  function updateRegistration(
    uint256 appId,
    UpdateRegistration calldata registration
  ) external;

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                        Permissions                         */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  /// @notice Check if a permission is disabled for all apps
  /// @param permission The permission to check
  /// @return bool True if the permission is disabled, false otherwise
  function isPermissionDisabled(
    string memory permission
  ) external view returns (bool);

  /// @notice Disable a permission for all apps
  /// @param permission The permission to disable
  function disablePermission(string memory permission) external;

  /// @notice Enable a permission for all apps
  /// @param permission The permission to enable
  /// @dev Reverts with PermissionDisabled if the permission is already disabled
  function enablePermission(string memory permission) external;
}
