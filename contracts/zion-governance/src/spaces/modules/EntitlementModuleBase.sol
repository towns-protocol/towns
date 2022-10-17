//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {ERC165} from "openzeppelin-contracts/contracts/utils/introspection/ERC165.sol";
import {Errors} from "../libraries/Errors.sol";
import {IEntitlementModule} from "../interfaces/IEntitlementModule.sol";
import {ISpaceManager} from "../interfaces/ISpaceManager.sol";
import {DataTypes} from "../libraries/DataTypes.sol";
import {PermissionTypes} from "../libraries/PermissionTypes.sol";

abstract contract EntitlementModuleBase is ERC165, IEntitlementModule {
  address public immutable _spaceManager;
  string private _name;
  string private _description;

  modifier onlySpaceManager() {
    if (msg.sender != _spaceManager) revert Errors.NotSpaceManager();
    _;
  }

  modifier onlyAllowed(
    string memory spaceId,
    string memory channelId,
    address caller
  ) {
    ISpaceManager spaceManager = ISpaceManager(_spaceManager);
    DataTypes.Permission memory grantPermission = spaceManager
      .getPermissionFromMap(PermissionTypes.ModifyPermissions);

    if (
      caller == _spaceManager ||
      spaceManager.getSpaceOwnerBySpaceId(spaceId) == caller ||
      spaceManager.isEntitled(spaceId, channelId, caller, grantPermission)
    ) {
      _;
    } else {
      revert Errors.NotAllowed();
    }
  }

  constructor(
    string memory name_,
    string memory description_,
    address spaceManager_
  ) {
    if (spaceManager_ == address(0)) {
      revert Errors.InvalidParameters();
    }

    _name = name_;
    _description = description_;
    _spaceManager = spaceManager_;
  }

  function name() external view returns (string memory) {
    return _name;
  }

  function description() external view returns (string memory) {
    return _description;
  }

  function supportsInterface(bytes4 interfaceId)
    public
    view
    virtual
    override(ERC165)
    returns (bool)
  {
    return
      interfaceId == type(IEntitlementModule).interfaceId ||
      super.supportsInterface(interfaceId);
  }
}
