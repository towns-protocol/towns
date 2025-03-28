// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISpaceApp} from "./interface/ISpaceApp.sol";

// libraries
import {AppId, AppKey} from "./libraries/AppId.sol";
import {App} from "./libraries/App.sol";

// contracts

interface IAppRegistryBase {
  // errors
  error InvalidApp();
  error InvalidSpace();
  // events
  event Registered(
    AppId indexed appId,
    App.Status indexed status,
    ISpaceApp indexed app
  );
  event StatusUpdated(AppId indexed appId, App.Status indexed status);
}

interface IAppRegistry is IAppRegistryBase {
  function register(AppKey memory appKey) external returns (AppId appId);
  function isRegistered(AppKey memory appKey) external view returns (bool);
  function getRegistration(
    AppKey memory appKey
  ) external view returns (App.State memory app);
  function setAppStatus(AppKey memory appKey, App.Status status) external;
}
