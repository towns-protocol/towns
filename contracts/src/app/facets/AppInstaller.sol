// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IAppRegistryBase} from "contracts/src/app/interfaces/IAppRegistry.sol";
import {IAppInstaller} from "contracts/src/app/interfaces/IAppInstaller.sol";

// libraries
import {App} from "contracts/src/app/libraries/App.sol";
import {Account} from "contracts/src/app/libraries/Account.sol";
import {AppRegistryStore} from "contracts/src/app/storage/AppRegistryStore.sol";
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";
import {StringSet} from "contracts/src/utils/StringSet.sol";
import {LibString} from "solady/utils/LibString.sol";
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";
import {HooksManager} from "contracts/src/app/libraries/HooksManager.sol";

// contracts
import {ERC6909} from "solady/tokens/ERC6909.sol";
import {Facet} from "@river-build/diamond/src/facets/Facet.sol";
import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";

/// @title AppInstaller
/// @notice Facet for installing and uninstalling apps
/// @dev Inherits from ERC6909 to handle app installations
contract AppInstaller is ERC6909, IAppInstaller, Facet, ReentrancyGuard {
  using App for App.Config;
  using Account for Account.Installation;
  using StringSet for StringSet.Set;
  using EnumerableSetLib for EnumerableSetLib.Uint256Set;

  // Add constant for maximum channels/permissions
  uint256 internal constant MAX_CHANNELS = 100;

  function __AppInstaller_init() external onlyInitializing {
    _addInterface(type(IAppInstaller).interfaceId);
  }

  /// @inheritdoc ERC6909
  function name(uint256 id) public view override returns (string memory) {
    return AppRegistryStore.layout().registrations[id].name;
  }

  /// @inheritdoc ERC6909
  function symbol(uint256 id) public view override returns (string memory) {
    return AppRegistryStore.layout().registrations[id].symbol;
  }

  /// @inheritdoc ERC6909
  function tokenURI(uint256 id) public view override returns (string memory) {
    return AppRegistryStore.layout().registrations[id].uri;
  }

  /// @inheritdoc IAppInstaller
  function install(
    uint256 appId,
    bytes32[] memory channelIds
  ) external nonReentrant {
    _install(appId, channelIds);
  }

  /// @inheritdoc IAppInstaller
  function uninstall(
    uint256 appId,
    bytes32[] memory channelIds
  ) external nonReentrant {
    _uninstall(appId, channelIds);
  }

  /// @inheritdoc IAppInstaller
  function getInstallationInfo(
    address account,
    uint256 appId
  )
    external
    view
    returns (bool installed, bytes32[] memory channels, string[] memory perms)
  {
    Account.Installation storage installation = AppRegistryStore
      .layout()
      .installations[account];
    installed = installation.installedApps.contains(appId);
    channels = installation.getChannels(appId);
    perms = installation.getPermissions(appId);
  }

  /// @inheritdoc IAppInstaller
  function installedApps(
    address account
  ) external view returns (uint256[] memory) {
    Account.Installation storage installation = AppRegistryStore
      .layout()
      .installations[account];
    return installation.getApps();
  }

  /// @inheritdoc IAppInstaller
  function permissions(
    address account,
    uint256 appId
  ) external view returns (string[] memory) {
    Account.Installation storage app = AppRegistryStore.layout().installations[
      account
    ];
    return app.getPermissions(appId);
  }

  /// @inheritdoc IAppInstaller
  function isInstalled(
    address account,
    uint256 appId,
    bytes32[] memory channelIds
  ) external view returns (bool) {
    Account.Installation storage installation = AppRegistryStore
      .layout()
      .installations[account];
    return installation.installed(appId, channelIds);
  }

  /// @inheritdoc IAppInstaller
  function isEntitled(
    address space,
    bytes32 channelId,
    address appAddress,
    bytes32 permission
  ) external view returns (bool) {
    AppRegistryStore.Layout storage ds = AppRegistryStore.layout();

    uint256 appId = ds.appIdByAddress[appAddress];
    if (appId == 0) return false;
    if (balanceOf(space, appId) == 0) return false;

    string memory permissionString = LibString.fromSmallString(permission);

    Account.Installation storage installation = ds.installations[space];
    return installation.isEntitled(appId, channelId, permissionString);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           Internal                         */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
  function _install(uint256 appId, bytes32[] memory channelIds) internal {
    if (appId == 0) CustomRevert.revertWith(AppInvalidAppId.selector);
    if (channelIds.length > MAX_CHANNELS)
      CustomRevert.revertWith(AppTooManyChannels.selector);

    App.Config storage config = AppRegistryStore.layout().registrations[appId];
    if (!config.exists())
      CustomRevert.revertWith(IAppRegistryBase.AppNotRegistered.selector);

    Account.Installation storage installation = AppRegistryStore
      .layout()
      .installations[msg.sender];

    if (installation.installed(appId, channelIds))
      CustomRevert.revertWith(AppAlreadyInstalled.selector);

    HooksManager.beforeInstall(config.hooks);
    installation.install(appId, channelIds, config.permissions.values());
    HooksManager.afterInstall(config.hooks);

    if (balanceOf(msg.sender, appId) == 0) _mint(msg.sender, appId, 1);

    emit AppInstalled(msg.sender, appId, channelIds);
  }

  function _uninstall(uint256 appId, bytes32[] memory channelIds) internal {
    if (appId == 0) CustomRevert.revertWith(AppInvalidAppId.selector);

    if (channelIds.length > MAX_CHANNELS)
      CustomRevert.revertWith(AppTooManyChannels.selector);

    App.Config storage config = AppRegistryStore.layout().registrations[appId];

    if (!config.exists())
      CustomRevert.revertWith(IAppRegistryBase.AppNotRegistered.selector);

    Account.Installation storage installation = AppRegistryStore
      .layout()
      .installations[msg.sender];

    if (!installation.installed(appId, channelIds))
      CustomRevert.revertWith(AppNotInstalled.selector);

    HooksManager.beforeUninstall(config.hooks);
    bool burnNFT = installation.uninstall(appId, channelIds);
    HooksManager.afterUninstall(config.hooks);

    if (burnNFT && balanceOf(msg.sender, appId) >= 1)
      _burn(msg.sender, appId, 1);

    emit AppUninstalled(msg.sender, appId, channelIds);
  }
}
