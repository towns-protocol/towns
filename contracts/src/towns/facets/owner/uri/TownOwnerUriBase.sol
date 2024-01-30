// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {ITownOwnerBase} from "contracts/src/towns/facets/owner/ITownOwner.sol";

// libraries
import {Base64} from "base64-sol/base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

// contracts
import {TownOwnerStorage} from "contracts/src/towns/facets/owner/TownOwnerStorage.sol";

abstract contract TownOwnerUriBase is ITownOwnerBase {
  function _render(
    uint256 tokenId
  ) internal view virtual returns (string memory) {
    TownOwnerStorage.Layout storage ds = TownOwnerStorage.layout();
    address townAddress = ds.townByTokenId[tokenId];

    if (townAddress == address(0)) return "";

    Town memory town = ds.townByAddress[townAddress];

    return
      string(
        abi.encodePacked(
          "data:application/json;base64,",
          Base64.encode(
            abi.encodePacked(
              '{"name":"',
              town.name,
              '","image":"',
              town.uri,
              '","external_url":"https://towns.com/',
              Strings.toHexString(townAddress),
              '","attributes":[{"trait_type":"Created","display_type": "date", "value":',
              Strings.toString(town.createdAt),
              "}]}"
            )
          )
        )
      );
  }
}
