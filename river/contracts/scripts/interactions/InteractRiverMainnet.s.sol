// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {Interaction} from "contracts/scripts/common/Interaction.s.sol";
import {Towns} from "contracts/src/tokens/towns/mainnet/Towns.sol";

// debugging
import {console} from "forge-std/console.sol";

contract InteractRiverMainnet is Interaction {
  function __interact(address) internal view override {
    address towns = address(0);

    address[] memory delegators = Towns(towns).getDelegators();

    for (uint256 i = 0; i < delegators.length; i++) {
      address delegator = delegators[i];
      console.log("Delegator:", delegator);
      console.log("Delegates:", Towns(towns).delegates(delegator));
    }
  }
}
