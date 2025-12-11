// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

import {IPlatformRequirements} from "src/factory/facets/platform/requirements/IPlatformRequirements.sol";
import {IPrepay} from "src/spaces/facets/prepay/IPrepay.sol";

// libraries
import {MembershipStorage} from "src/spaces/facets/membership/MembershipStorage.sol";
import {CurrencyTransfer} from "src/utils/libraries/CurrencyTransfer.sol";

// contracts
import {PrepayBase} from "./PrepayBase.sol";

import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {Entitled} from "src/spaces/facets/Entitled.sol";
import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";

contract PrepayFacet is IPrepay, PrepayBase, ReentrancyGuard, Entitled, Facet {
    function __PrepayFacet_init() external onlyInitializing {
        _addInterface(type(IPrepay).interfaceId);
    }

    function prepayMembership(uint256 supply) external payable nonReentrant {
        _validatePrepayCaller();
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

    function calculateMembershipPrepayFee(uint256 supply) external view returns (uint256) {
        MembershipStorage.Layout storage ds = MembershipStorage.layout();
        IPlatformRequirements platform = IPlatformRequirements(ds.spaceFactory);
        return supply * platform.getMembershipFee();
    }

    function _validatePrepayCaller() internal view {
        address spaceFactory = MembershipStorage.layout().spaceFactory;
        if (msg.sender != spaceFactory && msg.sender != _owner()) revert Prepay__NotAllowed();
    }
}
