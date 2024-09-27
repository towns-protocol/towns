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
    address space,
    string memory shortDescription,
    string memory longDescription
  ) internal {
    Validator.checkLength(name, 2);
    // if the space uri is empty, it will default to `${defaultUri}/${spaceAddress}`
    Validator.checkLength(uri, 0);
    Validator.checkAddress(space);

    SpaceOwnerStorage.Layout storage ds = SpaceOwnerStorage.layout();

    ds.spaceByTokenId[tokenId] = space;
    ds.spaceByAddress[space] = SpaceOwnerStorage.Space({
      name: name,
      uri: uri,
      tokenId: tokenId,
      createdAt: block.timestamp
    });
    ds.spaceMetadata[space] = SpaceOwnerStorage.SpaceMetadata({
      shortDescription: shortDescription,
      longDescription: longDescription
    });
  }

  function _updateSpace(
    address space,
    string memory name,
    string memory uri,
    string memory shortDescription,
    string memory longDescription
  ) internal {
    Validator.checkLength(name, 2);
    // if the space uri is empty, it will default to `${defaultUri}/${spaceAddress}`
    Validator.checkLength(uri, 0);

    SpaceOwnerStorage.Layout storage ds = SpaceOwnerStorage.layout();

    SpaceOwnerStorage.Space storage spaceInfo = ds.spaceByAddress[space];
    spaceInfo.name = name;
    spaceInfo.uri = uri;

    SpaceOwnerStorage.SpaceMetadata storage metadata = ds.spaceMetadata[space];
    metadata.shortDescription = shortDescription;
    metadata.longDescription = longDescription;

    emit SpaceOwner__UpdateSpace(space);
  }

  function _getSpace(address space) internal view returns (Space memory) {
    SpaceOwnerStorage.Space storage spaceInfo = SpaceOwnerStorage
      .layout()
      .spaceByAddress[space];

    SpaceOwnerStorage.SpaceMetadata storage metadata = SpaceOwnerStorage
      .layout()
      .spaceMetadata[space];

    return
      Space({
        name: spaceInfo.name,
        uri: spaceInfo.uri,
        tokenId: spaceInfo.tokenId,
        createdAt: spaceInfo.createdAt,
        shortDescription: metadata.shortDescription,
        longDescription: metadata.longDescription
      });
  }

  function _getTokenId(address space) internal view returns (uint256) {
    return SpaceOwnerStorage.layout().spaceByAddress[space].tokenId;
  }
}
