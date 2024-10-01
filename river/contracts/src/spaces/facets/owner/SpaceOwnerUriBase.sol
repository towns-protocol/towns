// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISpaceOwnerBase} from "contracts/src/spaces/facets/owner/ISpaceOwner.sol";

// libraries
import {LibString} from "solady/utils/LibString.sol";
import {Validator} from "contracts/src/utils/Validator.sol";

// contracts
import {SpaceOwnerStorage} from "contracts/src/spaces/facets/owner/SpaceOwnerStorage.sol";

abstract contract SpaceOwnerUriBase is ISpaceOwnerBase {
  using LibString for address;

  function _setDefaultUri(string memory uri) internal {
    Validator.checkLength(uri, 1);

    SpaceOwnerStorage.layout().defaultUri = uri;
    emit SpaceOwner__SetDefaultUri(uri);
  }

  function _getDefaultUri() internal view returns (string memory) {
    return SpaceOwnerStorage.layout().defaultUri;
  }

  /// @dev Returns `${space.uri}` or `${defaultUri}/space/${spaceAddress}`
  function _render(
    uint256 tokenId
  ) internal view virtual returns (string memory) {
    SpaceOwnerStorage.Layout storage ds = SpaceOwnerStorage.layout();
    address spaceAddress = ds.spaceByTokenId[tokenId];

    if (spaceAddress == address(0)) revert SpaceOwner__SpaceNotFound();

    SpaceOwnerStorage.Space storage space = ds.spaceByAddress[spaceAddress];

    // if the space has set a uri, return it
    if (bytes(space.uri).length != 0) return space.uri;

    string memory defaultUri = ds.defaultUri;

    uint256 length = bytes(defaultUri).length;
    if (length == 0) revert SpaceOwner__DefaultUriNotSet();

    unchecked {
      // the ASCII code for "/" is 0x2f
      if (bytes(defaultUri)[length - 1] != 0x2f) {
        return
          string.concat(
            defaultUri,
            "/space/",
            spaceAddress.toHexStringChecksummed()
          );
      } else {
        return
          string.concat(
            defaultUri,
            "space/",
            spaceAddress.toHexStringChecksummed()
          );
      }
    }
  }
}
