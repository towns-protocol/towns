// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISpaceOwnerBase} from "contracts/src/spaces/facets/owner/ISpaceOwner.sol";

// libraries
import {Base64} from "base64/base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

// contracts
import {SpaceOwnerStorage} from "contracts/src/spaces/facets/owner/SpaceOwnerStorage.sol";

abstract contract SpaceOwnerUriBase is ISpaceOwnerBase {
  function _render(
    uint256 tokenId
  ) internal view virtual returns (string memory) {
    SpaceOwnerStorage.Layout storage ds = SpaceOwnerStorage.layout();
    address spaceAddress = ds.spaceByTokenId[tokenId];

    if (spaceAddress == address(0)) return "";

    Space memory space = ds.spaceByAddress[spaceAddress];

    return
      string(
        abi.encodePacked(
          "data:application/json;base64,",
          Base64.encode(
            abi.encodePacked(
              '{"name":"',
              space.name,
              '","image":"',
              space.uri,
              '","attributes":[{"trait_type":"Created","display_type": "date", "value":',
              Strings.toString(space.createdAt),
              "}]}"
            )
          )
        )
      );
  }
}
