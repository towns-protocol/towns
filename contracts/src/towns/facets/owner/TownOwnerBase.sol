// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {ITownOwnerBase} from "./ITownOwner.sol";

// libraries
import {TownOwnerStorage} from "./TownOwnerStorage.sol";
import {Validator} from "contracts/src/utils/Validator.sol";

// contracts

abstract contract TownOwnerBase is ITownOwnerBase {
  modifier onlyFactory() {
    TownOwnerStorage.Layout storage ds = TownOwnerStorage.layout();
    if (msg.sender != ds.factory) {
      revert TownOwner__OnlyFactoryAllowed();
    }
    _;
  }

  function _setFactory(address factory) internal {
    Validator.checkAddress(factory);

    TownOwnerStorage.Layout storage ds = TownOwnerStorage.layout();
    ds.factory = factory;
    emit TownOwner__SetFactory(factory);
  }

  function _getFactory() internal view returns (address) {
    TownOwnerStorage.Layout storage ds = TownOwnerStorage.layout();
    return ds.factory;
  }

  function _mintTown(
    string memory name,
    string memory uri,
    uint256 tokenId,
    address townAddress,
    string memory networkId
  ) internal {
    Validator.checkLength(name, 2);
    Validator.checkLength(uri, 0);
    Validator.checkLength(networkId, 1);
    Validator.checkAddress(townAddress);

    TownOwnerStorage.Layout storage ds = TownOwnerStorage.layout();

    ds.townByAddress[townAddress] = Town({
      name: name,
      uri: uri,
      tokenId: tokenId,
      networkId: networkId,
      createdAt: block.timestamp
    });
  }

  function _updateTown(
    address town,
    string memory name,
    string memory uri
  ) internal {
    Validator.checkLength(name, 2);
    Validator.checkLength(uri, 1);

    TownOwnerStorage.Layout storage ds = TownOwnerStorage.layout();

    Town storage townInfo = ds.townByAddress[town];
    townInfo.name = name;
    townInfo.uri = uri;

    emit TownOwner__UpdateTown(town);
  }

  function _getTown(address town) internal view returns (Town memory) {
    TownOwnerStorage.Layout storage ds = TownOwnerStorage.layout();
    return ds.townByAddress[town];
  }
}
