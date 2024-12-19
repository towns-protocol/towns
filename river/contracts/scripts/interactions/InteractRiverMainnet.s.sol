// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {Interaction} from "contracts/scripts/common/Interaction.s.sol";
import {River} from "contracts/src/tokens/river/mainnet/River.sol";

// debugging
import {console} from "forge-std/console.sol";

contract InteractRiverMainnet is Interaction {
  function __interact(address) internal view override {
    address river = 0x53319181e003E7f86fB79f794649a2aB680Db244;

    address[] memory delegators = River(river).getDelegators();

    for (uint256 i = 0; i < delegators.length; i++) {
      address delegator = delegators[i];
      console.log("Delegator:", delegator);
      console.log("Delegates:", River(river).delegates(delegator));
    }
  }
}
