// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {ISpaceEntitlementModule} from "../interfaces/ISpaceEntitlementModule.sol";
import {DataTypes} from "../libraries/DataTypes.sol";

abstract contract SpaceEntitlementModule is
  Context,
  ERC165,
  ISpaceEntitlementModule
{
  /// @notice Entitlement name
  string private _name;

  /// @notice Entitlement description
  string private _description;

  /// @notice The address of the space manager
  address public immutable _spaceManager;

  constructor(
    string memory name_,
    string memory description_,
    address spaceManager_
  ) {
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
      interfaceId == type(ISpaceEntitlementModule).interfaceId ||
      super.supportsInterface(interfaceId);
  }
}
