// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISpaceOwnerBase} from "./ISpaceOwner.sol";

// libraries
import {SpaceOwnerStorage} from "./SpaceOwnerStorage.sol";
import {Validator} from "contracts/src/utils/Validator.sol";

// contracts

abstract contract SpaceOwnerBase is ISpaceOwnerBase {
  // =============================================================
  //                           Factory
  // =============================================================
  modifier onlyFactory() {
    SpaceOwnerStorage.Layout storage ds = SpaceOwnerStorage.layout();
    if (msg.sender != ds.factory) {
      revert SpaceOwner__OnlyFactoryAllowed();
    }
    _;
  }

  function _setFactory(address factory) internal {
    Validator.checkAddress(factory);

    SpaceOwnerStorage.Layout storage ds = SpaceOwnerStorage.layout();
    ds.factory = factory;
    emit SpaceOwner__SetFactory(factory);
  }

  function _getFactory() internal view returns (address) {
    SpaceOwnerStorage.Layout storage ds = SpaceOwnerStorage.layout();
    return ds.factory;
  }

  // =============================================================
  //                           Space
  // =============================================================

  function _mintSpace(
    string memory name,
    string memory uri,
    uint256 tokenId,
    address space
  ) internal {
    Validator.checkLength(name, 2);
    Validator.checkLength(uri, 0);
    Validator.checkAddress(space);

    SpaceOwnerStorage.Layout storage ds = SpaceOwnerStorage.layout();

    ds.spaceByTokenId[tokenId] = space;
    ds.spaceByAddress[space] = Space({
      name: name,
      uri: uri,
      tokenId: tokenId,
      createdAt: block.timestamp
    });
  }

  function _updateSpace(
    address space,
    string memory name,
    string memory uri
  ) internal {
    Validator.checkLength(name, 2);
    Validator.checkLength(uri, 1);

    SpaceOwnerStorage.Layout storage ds = SpaceOwnerStorage.layout();

    Space storage spaceInfo = ds.spaceByAddress[space];
    spaceInfo.name = name;
    spaceInfo.uri = uri;

    emit SpaceOwner__UpdateSpace(space);
  }

  function _getSpace(address space) internal view returns (Space memory) {
    SpaceOwnerStorage.Layout storage ds = SpaceOwnerStorage.layout();
    return ds.spaceByAddress[space];
  }
}
