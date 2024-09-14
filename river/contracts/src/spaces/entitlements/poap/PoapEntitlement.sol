// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ICrossChainEntitlement} from "contracts/src/spaces/entitlements/ICrossChainEntitlement.sol";
import {IPOAP} from "./IPOAP.sol";
// libraries

// contracts

contract PoapEntitlement is ICrossChainEntitlement {
  IPOAP immutable poapContract;

  constructor(address poapContractAddress) {
    poapContract = IPOAP(poapContractAddress);
  }

  function isEntitled(
    address[] calldata users,
    bytes calldata data
  ) external view returns (bool) {
    uint256 eventId = abi.decode(data, (uint256));

    for (uint256 i = 0; i < users.length; i++) {
      if (_hasEventPoap(users[i], eventId)) {
        return true;
      }
    }
    return false;
  }

  function parameters() external pure returns (Parameter[] memory) {
    Parameter[] memory schema = new Parameter[](1);
    schema[0] = Parameter(
      "eventId",
      "uint256",
      "The ID of the event associated with the POAP token"
    );
    return schema;
  }

  // =============================================================
  //                           Internals
  // =============================================================
  function _hasEventPoap(
    address user,
    uint256 eventId
  ) internal view returns (bool) {
    uint256 balance = poapContract.balanceOf(user);
    for (uint256 j = 0; j < balance; j++) {
      (uint256 ownedEventId, ) = poapContract.tokenDetailsOfOwnerByIndex(
        user,
        j
      );
      if (eventId == ownedEventId) {
        return true;
      }
    }
    return false;
  }
}
