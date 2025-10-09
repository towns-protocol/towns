// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IMembershipTiersBase} from "./IMembershipTiers.sol";

// libraries
import {MembershipTiersStorage} from "./MembershipTiersStorage.sol";
import {CurrencyTransfer} from "../../../../utils/libraries/CurrencyTransfer.sol";

// contracts

library MembershipTiersMapper {
    function toResponse(
        MembershipTiersStorage.TierState memory tier
    ) internal pure returns (IMembershipTiersBase.TierResponse memory) {
        return
            IMembershipTiersBase.TierResponse({
                metadata: string(abi.encodePacked(tier.config.metadataHash)),
                price: tier.pricing[0].price,
                amountDue: 0,
                duration: tier.pricing[0].duration,
                currency: tier.pricing[0].currency,
                totalSupply: tier.config.totalMinted
            });
    }

    function fromRequest(
        IMembershipTiersBase.TierRequest calldata request,
        uint16 tierId
    ) internal returns (MembershipTiersStorage.TierState storage) {
        address currency;
        if (request.currency == address(0)) currency = CurrencyTransfer.NATIVE_TOKEN;

        MembershipTiersStorage.TierState storage tier = MembershipTiersStorage.getLayout().tiers[
            tierId
        ];

        tier.tierId = tierId;
        tier.config.metadataHash = keccak256(bytes(request.metadata));

        if (tier.pricing.length > 0) tier.pricing.pop();
        tier.pricing.push(
            MembershipTiersStorage.TierPricing({
                price: request.price,
                duration: request.duration,
                currency: currency,
                pricingModule: address(0)
            })
        );

        return tier;
    }
}
