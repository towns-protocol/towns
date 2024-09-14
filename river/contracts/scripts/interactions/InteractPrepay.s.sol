// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {Interaction} from "contracts/scripts/common/Interaction.s.sol";
import {IPrepay} from "contracts/src/spaces/facets/prepay/IPrepay.sol";

// debuggging
import {console} from "forge-std/console.sol";

contract InteractPrepay is Interaction {
  IPrepay prepay = IPrepay(0x0000000000000000000000000000000000000000);

  function __interact(address deployer) internal override {
    uint256 expectedAmount = 1000;
    uint256 totalAmount = prepay.calculateMembershipPrepayFee(expectedAmount);

    console.log("paying:", totalAmount);

    vm.startBroadcast(deployer);
    IPrepay(prepay).prepayMembership{value: totalAmount}(expectedAmount);
    vm.stopBroadcast();

    console.log("prepaidSupply", prepay.prepaidMembershipSupply());
  }
}
