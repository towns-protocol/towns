// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IAppFactory} from "../interfaces/IAppFactory.sol";

// libraries
import {Inputs, Registry} from "../types/AppTypes.sol";
import {AppHelpers} from "../libraries/AppHelpers.sol";
import {AppFactoryStorage} from "../libraries/AppFactoryStorage.sol";
import {StringSet} from "contracts/src/utils/StringSet.sol";
import {Validator} from "contracts/src/utils/Validator.sol";

// contracts
import {OwnableBase} from "@river-build/diamond/src/facets/ownable/OwnableBase.sol";
import {Facet} from "@river-build/diamond/src/facets/Facet.sol";

contract AppFactory is IAppFactory, OwnableBase, Facet {
  using StringSet for StringSet.Set;
  using Validator for *;

  bytes32 internal constant MAX_PERMISSIONS = keccak256("MAX_PERMISSIONS");

  function __AppFactory_init(uint256 maxPermissions) external onlyInitializing {
    AppFactoryStorage.Layout storage ds = AppFactoryStorage.getLayout();
    ds.settings[MAX_PERMISSIONS] = abi.encode(maxPermissions);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           Reads                            */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
  function getApp(
    uint256 appId
  )
    external
    view
    returns (Registry.Config memory, string[] memory permissions)
  {
    AppFactoryStorage.Layout storage ds = AppFactoryStorage.getLayout();
    return (ds.configByAppId[appId], ds.permissionsByAppId[appId].values());
  }

  function getAppByAddress(
    address app
  )
    external
    view
    returns (Registry.Config memory, string[] memory permissions)
  {
    AppFactoryStorage.Layout storage ds = AppFactoryStorage.getLayout();

    return (
      ds.configByAppId[ds.appIdByAddress[app]],
      ds.permissionsByAppId[ds.appIdByAddress[app]].values()
    );
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           Writes                           */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function createApp(
    Inputs.CreateApp calldata params
  ) external returns (uint256 appId) {
    AppFactoryStorage.Layout storage ds = AppFactoryStorage.getLayout();

    params.app.checkAddress();
    params.owner.checkAddress();
    params.metadata.name.checkMaxLength(32);
    params.metadata.symbol.checkMaxLength(6);

    uint256 maxPermissions = abi.decode(
      ds.settings[MAX_PERMISSIONS],
      (uint256)
    );

    params.permissions.checkMaxArrayLength(maxPermissions);
    AppHelpers.checkCreateRegistration(
      ds,
      params.app,
      params.status,
      params.owner,
      params.permissions
    );

    return _register(ds, params);
  }

  function updateApp(uint256 appId, Inputs.UpdateApp calldata params) external {
    AppFactoryStorage.Layout storage ds = AppFactoryStorage.getLayout();

    params.metadata.name.checkMaxLength(32);
    params.metadata.symbol.checkMaxLength(6);

    uint256 maxPermissions = abi.decode(
      ds.settings[MAX_PERMISSIONS],
      (uint256)
    );
    params.permissions.checkMaxArrayLength(maxPermissions);

    Registry.Config storage config = ds.configByAppId[appId];

    AppHelpers.checkOwnership(config.owner, msg.sender);
    AppHelpers.checkInvalidPermissions(
      params.permissions,
      ds.invalidPermissions
    );

    _update(ds, appId, params);
  }

  function setAppStatus(
    uint256 appId,
    Registry.Status status
  ) external onlyOwner {
    AppFactoryStorage.Layout storage ds = AppFactoryStorage.getLayout();
    Registry.Config storage config = ds.configByAppId[appId];
    config.status = status;
    emit AppStatusUpdated(appId, status);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                         INTERNAL                           */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function _update(
    AppFactoryStorage.Layout storage ds,
    uint256 appId,
    Inputs.UpdateApp calldata params
  ) internal {
    Registry.Config storage config = ds.configByAppId[appId];
    config.metadata = params.metadata;

    StringSet.Set storage permissionsSet = ds.permissionsByAppId[appId];

    permissionsSet.clear();

    uint256 length = params.permissions.length;
    for (uint256 i; i < length; ++i) {
      permissionsSet.add(params.permissions[i]);
    }

    emit AppUpdated(
      appId,
      config.app,
      config.owner,
      params.metadata.name,
      params.metadata.symbol
    );
  }

  function _register(
    AppFactoryStorage.Layout storage ds,
    Inputs.CreateApp calldata params
  ) internal returns (uint256 appId) {
    appId = ++ds.appId;
    ds.appIdByAddress[params.app] = appId;

    Registry.Config storage config = ds.configByAppId[appId];
    config.app = params.app;
    config.status = params.status;
    config.owner = params.owner;
    config.tokenId = appId;
    config.metadata = params.metadata;

    StringSet.Set storage permissions = ds.permissionsByAppId[appId];
    uint256 length = params.permissions.length;

    for (uint256 i; i < length; ++i) {
      permissions.add(params.permissions[i]);
    }

    emit AppCreated(
      appId,
      params.app,
      params.owner,
      params.metadata.name,
      params.metadata.symbol
    );
  }
}
