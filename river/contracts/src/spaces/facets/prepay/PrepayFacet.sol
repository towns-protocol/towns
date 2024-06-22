// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IPrepay} from "contracts/src/spaces/facets/prepay/IPrepay.sol";
import {IPlatformRequirements} from "contracts/src/factory/facets/platform/requirements/IPlatformRequirements.sol";

// libraries
import {MembershipStorage} from "contracts/src/spaces/facets/membership/MembershipStorage.sol";
import {CurrencyTransfer} from "contracts/src/utils/libraries/CurrencyTransfer.sol";

// contracts
import {PrepayBase} from "./PrepayBase.sol";
import {ReentrancyGuard} from "contracts/src/diamond/facets/reentrancy/ReentrancyGuard.sol";
import {Entitled} from "contracts/src/spaces/facets/Entitled.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

contract PrepayFacet is IPrepay, PrepayBase, ReentrancyGuard, Entitled, Facet {
  function __PrepayFacet_init() external onlyInitializing {
    _addInterface(type(IPrepay).interfaceId);
  }

  function prepayMembership(
    uint256 supply
  ) external payable nonReentrant onlyOwner {
    if (supply == 0) revert Prepay__InvalidSupplyAmount();

    MembershipStorage.Layout storage ds = MembershipStorage.layout();
    IPlatformRequirements platform = IPlatformRequirements(ds.spaceFactory);

    uint256 cost = supply * platform.getMembershipFee();

    // validate payment covers membership fee
    if (msg.value != cost) revert Prepay__InvalidAmount();

    // add prepay
    _addPrepay(supply);

    // transfer fee to platform recipient
    address currency = ds.membershipCurrency;
    address platformRecipient = platform.getFeeRecipient();
    CurrencyTransfer.transferCurrency(
      currency,
      msg.sender, // from
      platformRecipient, // to
      cost
    );
  }

  function prepaidMembershipSupply() external view returns (uint256) {
    return _getPrepaidSupply();
  }

  function calculateMembershipPrepayFee(
    uint256 supply
  ) external view returns (uint256) {
    MembershipStorage.Layout storage ds = MembershipStorage.layout();
    IPlatformRequirements platform = IPlatformRequirements(ds.spaceFactory);
    return supply * platform.getMembershipFee();
  }
}
