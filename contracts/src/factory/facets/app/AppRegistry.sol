// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IAppRegistry} from "./IAppRegistry.sol";
import {ISpaceApp} from "./interface/ISpaceApp.sol";
import {IERC721} from "@openzeppelin/contracts/interfaces/IERC721.sol";

// libraries
import {AppKey, AppId} from "./libraries/AppId.sol";
import {App} from "./libraries/App.sol";
import {Actions} from "./libraries/Actions.sol";
import {ArchitectStorage} from "contracts/src/factory/facets/architect/ArchitectStorage.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";

contract AppRegistry is IAppRegistry, Facet, OwnableBase {
  using App for App.State;
  using Actions for ISpaceApp;

  /// @custom:storage-location erc7201:towns.app.registry.storage
  struct Layout {
    mapping(AppId id => App.State app) apps;
  }

  // keccak256(abi.encode(uint256(keccak256("towns.app.registry.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 constant DEFAULT_STORAGE_SLOT =
    0x97f004dd1211f81541acff9cd81687384947bc64ea25e261c178294e68b73600;

  function __AppRegistry_init() external {
    _addInterface(type(IAppRegistry).interfaceId);
  }

  // actions
  function register(AppKey memory appKey) external returns (AppId appId) {
    // validations
    validateSpace(appKey.space);
    if (!appKey.app.isValidAction()) revert InvalidApp();

    appId = appKey.toId();

    getLayout().apps[appId].initialize(appKey.app, appKey.space);

    emit Registered(appId, App.Status.Pending, appKey.app);

    appKey.app.callOnRegister(appKey);
  }

  function isRegistered(AppKey memory appKey) external view returns (bool) {
    return getLayout().apps[appKey.toId()].space != address(0);
  }

  function getRegistration(
    AppKey memory appKey
  ) external view returns (App.State memory app) {
    app = getLayout().apps[appKey.toId()];
  }

  function setAppStatus(
    AppKey memory appKey,
    App.Status status
  ) external onlyOwner {
    AppId appId = appKey.toId();
    getLayout().apps[appId].status = status;
    emit StatusUpdated(appId, status);
  }

  // validations
  function validateSpace(address space) internal view {
    uint256 tokenId = ArchitectStorage.layout().tokenIdBySpace[space];

    // space must be valid
    if (space == address(0)) revert InvalidSpace();

    // space must exist in architect storage
    if (tokenId == 0) revert InvalidSpace();

    // only owner of the space can register an app
    if (IERC721(space).ownerOf(tokenId) != msg.sender) revert InvalidSpace();
  }

  // storage
  function getLayout() internal pure returns (Layout storage $) {
    assembly ("memory-safe") {
      $.slot := DEFAULT_STORAGE_SLOT
    }
  }
}
