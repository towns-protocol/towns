// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries
import {TownArchitectStorage} from "./TownArchitectStorage.sol";
import {StringSet} from "contracts/src/utils/StringSet.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

// contracts
error TownArchitectService__InvalidStringLength();
error TownArchitectService__InvalidNetworkId();
error TownArchitectService__InvalidAddress();
error TownArchitectService__NotContract();

library TownArchitectService {
  using StringSet for StringSet.Set;

  address internal constant EVERYONE_ADDRESS = address(1);

  function getTownCount() internal view returns (uint256) {
    TownArchitectStorage.Layout storage ds = TownArchitectStorage.layout();
    return ds.townIds.length();
  }

  function getTownById(string memory townId) internal view returns (address) {
    TownArchitectStorage.Layout storage ds = TownArchitectStorage.layout();
    return ds.townById[townId];
  }

  function getTokenIdByTownId(
    string memory townId
  ) internal view returns (uint256) {
    TownArchitectStorage.Layout storage ds = TownArchitectStorage.layout();
    return ds.tokenIdByTownId[townId];
  }

  function setTown(
    string memory townId,
    uint256 tokenId,
    address town
  ) internal {
    TownArchitectStorage.Layout storage ds = TownArchitectStorage.layout();

    ds.townIds.add(townId);
    ds.townById[townId] = town;
    ds.tokenIdByTownId[townId] = tokenId;
  }

  function setImplementations(
    address townToken,
    address userEntitlement,
    address tokenEntitlement
  ) internal {
    if (!Address.isContract(townToken))
      revert TownArchitectService__NotContract();
    if (!Address.isContract(userEntitlement))
      revert TownArchitectService__NotContract();
    if (!Address.isContract(tokenEntitlement))
      revert TownArchitectService__NotContract();

    TownArchitectStorage.Layout storage ds = TownArchitectStorage.layout();
    ds.townToken = townToken;
    ds.userEntitlement = userEntitlement;
    ds.tokenEntitlement = tokenEntitlement;
  }

  function checkNetworkIdAvailability(string memory townId) internal view {
    TownArchitectStorage.Layout storage ds = TownArchitectStorage.layout();

    if (ds.townIds.contains(townId))
      revert TownArchitectService__InvalidNetworkId();
  }

  function checkStringLength(string memory name) internal pure {
    bytes memory byteName = bytes(name);
    if (byteName.length == 0)
      revert TownArchitectService__InvalidStringLength();
  }

  function hashString(string memory name) internal pure returns (bytes32) {
    return keccak256(abi.encodePacked(name));
  }

  function checkAddress(address addr) internal pure {
    if (addr == address(0)) revert TownArchitectService__InvalidAddress();
  }
}
