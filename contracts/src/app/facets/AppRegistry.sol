// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IAppRegistry} from "contracts/src/app/interfaces/IAppRegistry.sol";

// libraries
import {HooksManager} from "contracts/src/app/libraries/HooksManager.sol";
import {AppRegistryStore} from "contracts/src/app/storage/AppRegistryStore.sol";
import {App} from "contracts/src/app/libraries/App.sol";
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";
import {Validator} from "contracts/src/utils/Validator.sol";
import {Permissions} from "contracts/src/spaces/facets/Permissions.sol";
import {StringSet} from "contracts/src/utils/StringSet.sol";

// contracts
import {Facet} from "@river-build/diamond/src/facets/Facet.sol";
import {OwnableBase} from "@river-build/diamond/src/facets/ownable/OwnableBase.sol";

/// @title AppRegistry
/// @notice Registry for apps
/// @dev Inherits from OwnableBase to handle ownership
contract AppRegistry is IAppRegistry, OwnableBase, Facet {
  using EnumerableSetLib for EnumerableSetLib.Uint256Set;
  using EnumerableSetLib for EnumerableSetLib.Bytes32Set;
  using App for App.Config;
  using StringSet for StringSet.Set;

  // Add validation for maximum permissions
  uint256 private constant MAX_PERMISSIONS = 50;

  function __AppRegistry_init() external onlyInitializing {
    AppRegistryStore.Layout storage ds = AppRegistryStore.layout();
    ds.invalidPermissions[Permissions.InstallApp] = true;
    ds.invalidPermissions[Permissions.UninstallApp] = true;
    ds.invalidPermissions[Permissions.ModifyBanning] = true;
    ds.invalidPermissions[Permissions.ModifyChannel] = true;
    ds.invalidPermissions[Permissions.ModifySpaceSettings] = true;
    ds.invalidPermissions[Permissions.JoinSpace] = true;
  }

  /// @inheritdoc IAppRegistry
  function register(
    Registration calldata registration
  ) external returns (uint256) {
    _validateRegistrationInputs(registration);

    AppRegistryStore.Layout storage ds = AppRegistryStore.layout();

    if (ds.appIdByAddress[registration.appAddress] != 0)
      CustomRevert.revertWith(AppAlreadyRegistered.selector);

    uint256 tokenId = ++ds.nextAppId;
    ds.appIdByAddress[registration.appAddress] = tokenId;
    App.Config storage config = ds.registrations[tokenId];

    if (config.exists()) CustomRevert.revertWith(AppAlreadyRegistered.selector);

    HooksManager.beforeRegister(registration.hooks);
    config.initialize(tokenId, registration);
    HooksManager.afterRegister(registration.hooks);

    emit AppRegistered(
      registration.owner,
      registration.appAddress,
      tokenId,
      registration
    );

    return tokenId;
  }

  /// @inheritdoc IAppRegistry
  function isRegistered(address appAddress) external view returns (bool) {
    return AppRegistryStore.layout().appIdByAddress[appAddress] != 0;
  }

  /// @inheritdoc IAppRegistry
  function getRegistration(
    address appAddress
  ) external view returns (Registration memory) {
    uint256 appId = AppRegistryStore.layout().appIdByAddress[appAddress];
    App.Config storage config = AppRegistryStore.layout().registrations[appId];

    if (!config.exists()) CustomRevert.revertWith(AppNotRegistered.selector);

    return
      Registration({
        appAddress: config.appAddress,
        owner: config.owner,
        uri: config.uri,
        name: config.name,
        symbol: config.symbol,
        permissions: config.permissions.values(),
        disabled: config.disabled,
        hooks: config.hooks
      });
  }

  /// @inheritdoc IAppRegistry
  function updateRegistration(
    uint256 appId,
    UpdateRegistration calldata registration
  ) external {
    Validator.checkStringLength(registration.uri);

    App.Config storage config = AppRegistryStore.layout().registrations[appId];

    if (!config.exists()) CustomRevert.revertWith(AppNotRegistered.selector);

    if (msg.sender != config.owner)
      CustomRevert.revertWith(AppNotOwnedBySender.selector);

    _validatePermissions(registration.permissions);

    config.update(registration);

    emit AppUpdated(config.owner, config.appAddress, appId, registration);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                        Permissions                         */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  /// @inheritdoc IAppRegistry
  function isPermissionDisabled(
    string memory permission
  ) external view returns (bool) {
    return AppRegistryStore.layout().invalidPermissions[permission];
  }

  /// @inheritdoc IAppRegistry
  function disablePermission(string memory permission) external onlyOwner {
    AppRegistryStore.layout().invalidPermissions[permission] = true;
    emit PermissionStateChanged(msg.sender, permission, false);
  }

  /// @inheritdoc IAppRegistry
  function enablePermission(string memory permission) external onlyOwner {
    delete AppRegistryStore.layout().invalidPermissions[permission];
    emit PermissionStateChanged(msg.sender, permission, true);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                        Internals                           */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
  function _validateRegistrationInputs(
    Registration calldata registration
  ) private view {
    Validator.checkAddress(registration.appAddress);
    Validator.checkAddress(registration.owner);
    Validator.checkStringLength(registration.uri);
    Validator.checkStringLength(registration.name);
    Validator.checkStringLength(registration.symbol);

    if (msg.sender != registration.owner)
      CustomRevert.revertWith(AppNotOwnedBySender.selector);

    if (registration.disabled) CustomRevert.revertWith(AppDisabled.selector);

    if (registration.permissions.length == 0)
      CustomRevert.revertWith(AppPermissionsMissing.selector);

    _validatePermissions(registration.permissions);

    HooksManager.validateHookAddress(registration.hooks);
  }

  function _validatePermissions(string[] memory permissions) internal view {
    if (permissions.length == 0) return;
    if (permissions.length > MAX_PERMISSIONS)
      CustomRevert.revertWith(AppTooManyPermissions.selector);

    AppRegistryStore.Layout storage ds = AppRegistryStore.layout();
    for (uint256 i; i < permissions.length; ++i) {
      if (ds.invalidPermissions[permissions[i]])
        CustomRevert.revertWith(AppInvalidPermission.selector);
    }
  }
}
