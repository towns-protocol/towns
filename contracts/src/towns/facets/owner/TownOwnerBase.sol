// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {ITownOwnerBase} from "./ITownOwner.sol";

// libraries
import {TownOwnerStorage} from "./TownOwnerStorage.sol";

// contracts

abstract contract TownOwnerBase is ITownOwnerBase {
  function _setFactory(address factory) internal {
    TownOwnerStorage.Layout storage ds = TownOwnerStorage.layout();
    ds.factory = factory;
  }

  modifier onlyFactory() {
    TownOwnerStorage.Layout storage ds = TownOwnerStorage.layout();
    if (msg.sender != ds.factory) {
      revert TownOwner__OnlyFactoryAllowed();
    }
    _;
  }

  function _createTown(
    string memory name,
    string memory uri,
    uint256 tokenId,
    address townAddress,
    string memory networkId
  ) internal {
    TownOwnerStorage.Layout storage ds = TownOwnerStorage.layout();

    ds.townByAddress[townAddress] = Town({
      name: name,
      uri: uri,
      tokenId: tokenId,
      networkId: networkId,
      createdAt: block.timestamp
    });
  }

  function _getTown(address town) internal view returns (Town memory) {
    TownOwnerStorage.Layout storage ds = TownOwnerStorage.layout();
    return ds.townByAddress[town];
  }
}
