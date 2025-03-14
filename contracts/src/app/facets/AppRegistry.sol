// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IAppRegistry} from "../interfaces/IAppRegistry.sol";

// libraries
import {Inputs, Registry} from "../types/AppTypes.sol";
import {Helpers} from "../libraries/AppHelpers.sol";
import {AppRegistryStorage} from "../libraries/AppRegistryStorage.sol";
import {StringSet} from "contracts/src/utils/StringSet.sol";
import {Validator} from "contracts/src/utils/Validator.sol";

// contracts
import {OwnableBase} from "@river-build/diamond/src/facets/ownable/OwnableBase.sol";
import {Facet} from "@river-build/diamond/src/facets/Facet.sol";

contract AppRegistry is IAppRegistry, OwnableBase, Facet {
  using StringSet for StringSet.Set;
  using Validator for *;

  bytes32 internal constant MAX_PERMISSIONS = keccak256("MAX_PERMISSIONS");

  function __AppRegistry_init(
    uint256 maxPermissions
  ) internal onlyInitializing {
    AppRegistryStorage.Layout storage ds = AppRegistryStorage.getLayout();
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
    AppRegistryStorage.Layout storage ds = AppRegistryStorage.getLayout();
    return (ds.configByAppId[appId], ds.permissionsByAppId[appId].values());
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           Writes                           */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function createApp(Inputs.CreateApp calldata params) external {
    AppRegistryStorage.Layout storage ds = AppRegistryStorage.getLayout();

    params.app.checkAddress();
    params.owner.checkAddress();
    params.metadata.name.checkLength(32);
    params.metadata.symbol.checkLength(6);
    params.permissions.checkMaxArrayLength(
      abi.decode(ds.settings[MAX_PERMISSIONS], (uint256))
    );
    Helpers.checkCreateRegistration(
      ds,
      params.app,
      params.status,
      params.owner,
      params.permissions
    );

    _register(ds, params);
  }

  function updateApp(uint256 appId, Inputs.UpdateApp calldata params) external {
    AppRegistryStorage.Layout storage ds = AppRegistryStorage.getLayout();

    params.metadata.name.checkLength(32);
    params.metadata.symbol.checkLength(6);
    params.permissions.checkMaxArrayLength(
      abi.decode(ds.settings[MAX_PERMISSIONS], (uint256))
    );

    Registry.Config storage config = ds.configByAppId[appId];

    Helpers.checkOwnership(config.owner, msg.sender);
    Helpers.checkInvalidPermissions(params.permissions, ds.invalidPermissions);

    _update(ds, appId, params);
  }

  function setAppStatus(
    uint256 appId,
    Registry.Status status
  ) external onlyOwner {
    AppRegistryStorage.Layout storage ds = AppRegistryStorage.getLayout();
    Registry.Config storage config = ds.configByAppId[appId];
    config.status = status;
    emit AppStatusUpdated(appId, status);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                         INTERNAL                           */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function _update(
    AppRegistryStorage.Layout storage ds,
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
    AppRegistryStorage.Layout storage ds,
    Inputs.CreateApp calldata params
  ) internal {
    uint256 appId = ++ds.appId;
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

    emit AppRegistered(
      appId,
      params.app,
      params.owner,
      params.metadata.name,
      params.metadata.symbol
    );
  }
}
