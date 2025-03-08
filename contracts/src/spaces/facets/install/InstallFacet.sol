// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IInstallFacet} from "contracts/src/spaces/facets/install/IInstallFacet.sol";
// libraries
import {InstallLib} from "contracts/src/spaces/facets/install/InstallLib.sol";
import {Permissions} from "contracts/src/spaces/facets/Permissions.sol";

// contracts
import {Entitled} from "contracts/src/spaces/facets/Entitled.sol";

/// @title InstallFacet
/// @notice Facet for installing and uninstalling apps in a space
/// @dev Inherits from Entitled to handle permission validation
contract InstallFacet is Entitled, IInstallFacet {
  /// @inheritdoc IInstallFacet
  function installApp(uint256 appId, bytes32[] memory channelIds) external {
    _validatePermission(Permissions.InstallApp);
    InstallLib.installApp(appId, channelIds);
  }

  /// @inheritdoc IInstallFacet
  function uninstallApp(uint256 appId, bytes32[] memory channelIds) external {
    _validatePermission(Permissions.UninstallApp);
    InstallLib.uninstallApp(appId, channelIds);
  }
}
