// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDropFacetBase} from "./IDropFacet.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// libraries
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";

import {DropClaimLib} from "./DropClaimLib.sol";

library DropFacetLib {
    using DropClaimLib for DropClaimLib.ClaimCondition;

    // keccak256(abi.encode(uint256(keccak256("diamond.facets.drop.storage")) - 1)) &
    // ~bytes32(uint256(0xff))
    bytes32 constant STORAGE_SLOT =
        0xeda6a1e2ce6f1639b6d3066254ca87a2daf51c4f0ad5038d408bbab6cc2cab00;

    struct Layout {
        address rewardsDistribution;
        uint48 conditionStartId;
        uint48 conditionCount;
        mapping(uint256 conditionId => mapping(address => DropClaimLib.SupplyClaim))
            supplyClaimedByWallet;
        mapping(uint256 conditionId => DropClaimLib.ClaimCondition) conditionById;
    }

    function getActiveConditionId(Layout storage self) internal view returns (uint256) {
        (uint48 conditionStartId, uint48 conditionCount) =
            (self.conditionStartId, self.conditionCount);

        if (conditionCount == 0) {
            CustomRevert.revertWith(IDropFacetBase.DropFacet__NoActiveClaimCondition.selector);
        }

        uint256 lastConditionId;
        unchecked {
            lastConditionId = conditionStartId + conditionCount - 1;
        }

        for (uint256 i = lastConditionId; i >= conditionStartId; --i) {
            DropClaimLib.ClaimCondition storage condition = self.conditionById[i];
            uint256 endTimestamp = condition.endTimestamp;
            if (
                block.timestamp >= condition.startTimestamp
                    && (endTimestamp == 0 || block.timestamp < endTimestamp)
            ) {
                return i;
            }
        }

        CustomRevert.revertWith(IDropFacetBase.DropFacet__NoActiveClaimCondition.selector);
    }

    function getClaimConditionById(
        Layout storage self,
        uint256 conditionId
    )
        internal
        view
        returns (DropClaimLib.ClaimCondition storage)
    {
        return self.conditionById[conditionId];
    }

    function getSupplyClaimedByWallet(
        Layout storage self,
        uint256 conditionId,
        address account
    )
        internal
        view
        returns (DropClaimLib.SupplyClaim storage)
    {
        return self.supplyClaimedByWallet[conditionId][account];
    }

    function addClaimCondition(
        Layout storage self,
        DropClaimLib.ClaimCondition calldata newCondition
    )
        internal
    {
        (uint48 existingStartId, uint48 existingCount) =
            (self.conditionStartId, self.conditionCount);
        uint48 newConditionId = existingStartId + existingCount;

        // Check timestamp order
        if (existingCount > 0) {
            DropClaimLib.ClaimCondition memory lastCondition;
            unchecked {
                lastCondition = self.conditionById[newConditionId - 1];
            }
            if (lastCondition.startTimestamp >= newCondition.startTimestamp) {
                CustomRevert.revertWith(
                    IDropFacetBase.DropFacet__ClaimConditionsNotInAscendingOrder.selector
                );
            }
        }

        // verify enough balance
        verifyEnoughBalance(newCondition.currency, newCondition.maxClaimableSupply);

        self.conditionById[newConditionId] = newCondition;

        // Update condition count
        self.conditionCount = existingCount + 1;

        emit IDropFacetBase.DropFacet_ClaimConditionAdded(newConditionId, newCondition);
    }

    function getClaimConditions(Layout storage self)
        internal
        view
        returns (DropClaimLib.ClaimCondition[] memory conditions)
    {
        conditions = new DropClaimLib.ClaimCondition[](self.conditionCount);
        for (uint256 i; i < self.conditionCount; ++i) {
            conditions[i] = self.conditionById[self.conditionStartId + i];
        }
        return conditions;
    }

    function setClaimConditions(
        Layout storage self,
        DropClaimLib.ClaimCondition[] calldata conditions
    )
        internal
    {
        // get the existing claim condition count and start id
        (uint48 newStartId, uint48 existingConditionCount) =
            (self.conditionStartId, self.conditionCount);

        if (uint256(newStartId) + conditions.length > type(uint48).max) {
            CustomRevert.revertWith(IDropFacetBase.DropFacet__CannotSetClaimConditions.selector);
        }

        uint48 newConditionCount = uint48(conditions.length);

        uint48 lastConditionTimestamp;
        uint256 totalClaimableSupply;

        for (uint256 i; i < newConditionCount; ++i) {
            DropClaimLib.ClaimCondition calldata newCondition = conditions[i];
            if (lastConditionTimestamp >= newCondition.startTimestamp) {
                CustomRevert.revertWith(
                    IDropFacetBase.DropFacet__ClaimConditionsNotInAscendingOrder.selector
                );
            }

            // check that amount already claimed is less than or equal to the max claimable supply
            DropClaimLib.ClaimCondition storage condition = self.conditionById[newStartId + i];
            uint256 amountAlreadyClaimed = condition.supplyClaimed;

            if (amountAlreadyClaimed > newCondition.maxClaimableSupply) {
                CustomRevert.revertWith(IDropFacetBase.DropFacet__CannotSetClaimConditions.selector);
            }

            // copy the new condition to the storage except `supplyClaimed`
            condition.updateClaimCondition(newCondition);

            lastConditionTimestamp = newCondition.startTimestamp;
            totalClaimableSupply += newCondition.maxClaimableSupply;
            verifyEnoughBalance(newCondition.currency, totalClaimableSupply);
        }

        self.conditionCount = newConditionCount;

        if (existingConditionCount > newConditionCount) {
            for (uint256 i = newConditionCount; i < existingConditionCount; ++i) {
                unchecked {
                    delete self.conditionById[newStartId + i];
                }
            }
        }

        emit IDropFacetBase.DropFacet_ClaimConditionsUpdated(newStartId, conditions);
    }

    function updateDepositId(
        DropClaimLib.SupplyClaim storage claimed,
        uint256 depositId
    )
        internal
    {
        claimed.depositId = depositId;
    }

    function verifyEnoughBalance(address currency, uint256 amount) internal view {
        if (amount > IERC20(currency).balanceOf(address(this))) {
            CustomRevert.revertWith(IDropFacetBase.DropFacet__InsufficientBalance.selector);
        }
    }

    function approveClaimToken(
        Layout storage self,
        DropClaimLib.ClaimCondition storage condition,
        uint256 amount
    )
        internal
    {
        IERC20(condition.currency).approve(self.rewardsDistribution, amount);
    }

    function setRewardsDistribution(Layout storage self, address rewardsDistribution) internal {
        if (rewardsDistribution == address(0)) {
            CustomRevert.revertWith(IDropFacetBase.DropFacet__RewardsDistributionNotSet.selector);
        }

        self.rewardsDistribution = rewardsDistribution;
    }

    // =============================================================
    //                        Utilities
    // =============================================================

    function getLayout() internal pure returns (Layout storage l) {
        assembly ("memory-safe") {
            l.slot := STORAGE_SLOT
        }
    }
}
