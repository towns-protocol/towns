// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IAppFactory} from "../interfaces/IAppFactory.sol";
import {ITownsApp} from "../interfaces/ITownsApp.sol";

// libraries
import {Inputs, Registry} from "../types/AppTypes.sol";
import {AppHelpers} from "../libraries/AppHelpers.sol";
import {AppFactoryStorage} from "../libraries/AppFactoryStorage.sol";
import {StringSet} from "contracts/src/utils/StringSet.sol";
import {Validator} from "contracts/src/utils/Validator.sol";
import {TownsApp} from "../libraries/TownsApp.sol";
import {RegistryLib} from "../libraries/RegistryLib.sol";
// contracts
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";

contract AppFactory is OwnableBase, Facet {
  using StringSet for StringSet.Set;
  using AppLib for ITownsApp;
  using RegistryLib for Registry.App;
  function __AppFactory_init() external onlyInitializing {}

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           Reads                            */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           Writes                           */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function register(
    Inputs.CreateApp memory params
  ) external returns (uint256 appId) {
    AppFactoryStorage.Layout storage ds = AppFactoryStorage.getLayout();

    string[] memory permissions = params.app.permissions();

    params.app.isValidApp(permissions);
    ds.validatePermissions(permissions);

    appId = ds.registerAppId(params.app);

    RegistryLib.App storage app = ds.appById[appId];
    app.initialize(params.app, params.owner, params.space, permissions);

    return appId;
  }
}
