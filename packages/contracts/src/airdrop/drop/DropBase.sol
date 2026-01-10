// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDropFacetBase} from "./IDropFacet.sol";

// libraries
import {BasisPoints} from "../../utils/libraries/BasisPoints.sol";
import {CustomRevert} from "../../utils/libraries/CustomRevert.sol";
import {DropGroup} from "./DropGroup.sol";
import {DropStorage} from "./DropStorage.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";

abstract contract DropBase is IDropFacetBase {
    using DropGroup for DropGroup.Layout;
    using SafeTransferLib for address;
    using CustomRevert for bytes4;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          SETTERS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _setRewardsDistribution(address rewardsDistribution) internal {
        if (rewardsDistribution == address(0)) {
            DropFacet__RewardsDistributionNotSet.selector.revertWith();
        }

        _getLayout().rewardsDistribution = rewardsDistribution;
    }

    function _addClaimCondition(DropGroup.ClaimCondition calldata newCondition) internal {
        (uint48 existingStartId, uint48 existingCount) = _getStartIdAndCount();
        uint48 newConditionId = existingStartId + existingCount;

        // Check timestamp order
        if (existingCount > 0) {
            DropGroup.ClaimCondition storage lastCondition;
            unchecked {
                lastCondition = _getClaimConditionById(newConditionId - 1);
            }
            if (lastCondition.startTimestamp >= newCondition.startTimestamp) {
                DropFacet__ClaimConditionsNotInAscendingOrder.selector.revertWith();
            }
        }

        // verify enough balance
        _verifyEnoughBalance(newCondition.currency, newCondition.maxClaimableSupply);

        _getDropGroup(newConditionId).condition = newCondition;

        // Update condition count
        _getLayout().conditionCount = existingCount + 1;

        emit DropFacet_ClaimConditionAdded(newConditionId, newCondition);
    }

    function _setClaimConditions(DropGroup.ClaimCondition[] calldata conditions) internal {
        DropStorage.Layout storage self = _getLayout();
        // get the existing claim condition count and start id
        (uint48 newStartId, uint48 existingConditionCount) = _getStartIdAndCount();

        if (uint256(newStartId) + conditions.length > type(uint48).max) {
            DropFacet__CannotSetClaimConditions.selector.revertWith();
        }

        uint48 newConditionCount = uint48(conditions.length);

        uint48 lastConditionTimestamp;
        uint256 totalClaimableSupply;

        for (uint256 i; i < newConditionCount; ++i) {
            DropGroup.ClaimCondition calldata newCondition = conditions[i];
            if (lastConditionTimestamp >= newCondition.startTimestamp) {
                DropFacet__ClaimConditionsNotInAscendingOrder.selector.revertWith();
            }

            // check that amount already claimed is less than or equal to the max claimable supply
            DropGroup.Layout storage drop = self.groupById[newStartId + i];
            uint256 amountAlreadyClaimed = drop.condition.supplyClaimed;

            if (amountAlreadyClaimed > newCondition.maxClaimableSupply) {
                DropFacet__CannotSetClaimConditions.selector.revertWith();
            }

            // copy the new condition to the storage except `supplyClaimed`
            drop.updateClaimCondition(newCondition);

            lastConditionTimestamp = newCondition.startTimestamp;
            totalClaimableSupply += newCondition.maxClaimableSupply;
            _verifyEnoughBalance(newCondition.currency, totalClaimableSupply);
        }

        self.conditionCount = newConditionCount;

        if (existingConditionCount > newConditionCount) {
            for (uint256 i = newConditionCount; i < existingConditionCount; ++i) {
                unchecked {
                    delete self.groupById[newStartId + i];
                }
            }
        }

        emit DropFacet_ClaimConditionsUpdated(newStartId, conditions);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                            UTILS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _approveClaimToken(address token, uint256 amount) internal {
        token.safeApprove(_getLayout().rewardsDistribution, amount);
    }

    function _verifyEnoughBalance(address token, uint256 amount) internal view {
        if (amount > token.balanceOf(address(this))) {
            DropFacet__InsufficientBalance.selector.revertWith();
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          GETTERS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _getDropGroup(uint256 conditionId) internal view returns (DropGroup.Layout storage) {
        return _getLayout().groupById[conditionId];
    }

    function _getClaimConditionById(
        uint256 conditionId
    ) internal view returns (DropGroup.ClaimCondition storage) {
        return _getDropGroup(conditionId).condition;
    }

    function _getSupplyClaimedByWallet(
        uint256 conditionId,
        address account
    ) internal view returns (DropGroup.Claimed storage) {
        return _getDropGroup(conditionId).supplyClaimedByWallet[account];
    }

    function _getStartIdAndCount() internal view returns (uint48 startId, uint48 count) {
        DropStorage.Layout storage self = _getLayout();
        (startId, count) = (self.conditionStartId, self.conditionCount);
    }

    function _getClaimConditions()
        internal
        view
        returns (DropGroup.ClaimCondition[] memory conditions)
    {
        (uint48 conditionStartId, uint48 conditionCount) = _getStartIdAndCount();
        conditions = new DropGroup.ClaimCondition[](conditionCount);
        for (uint256 i; i < conditionCount; ++i) {
            conditions[i] = _getClaimConditionById(conditionStartId + i);
        }
        return conditions;
    }

    function _getActiveConditionId() internal view returns (uint256) {
        (uint48 conditionStartId, uint48 conditionCount) = _getStartIdAndCount();

        if (conditionCount == 0) {
            DropFacet__NoActiveClaimCondition.selector.revertWith();
        }

        uint256 lastConditionId;
        unchecked {
            lastConditionId = conditionStartId + conditionCount - 1;
        }

        for (uint256 i = lastConditionId + 1; i > conditionStartId; ) {
            unchecked {
                --i;
            }

            DropGroup.ClaimCondition storage condition = _getClaimConditionById(i);
            uint256 endTimestamp = condition.endTimestamp;
            if (
                block.timestamp >= condition.startTimestamp &&
                (endTimestamp == 0 || block.timestamp < endTimestamp)
            ) {
                return i;
            }
        }

        DropFacet__NoActiveClaimCondition.selector.revertWith();
    }

    function _deductPenalty(
        uint256 amount,
        uint16 penaltyBps,
        uint16 expectedPenaltyBps
    ) internal pure returns (uint256) {
        if (penaltyBps != expectedPenaltyBps) {
            DropFacet__UnexpectedPenaltyBps.selector.revertWith();
        }

        if (penaltyBps > 0) {
            unchecked {
                uint256 penaltyAmount = BasisPoints.calculate(amount, penaltyBps);
                amount -= penaltyAmount;
            }
        }
        return amount;
    }

    function _getLayout() internal pure returns (DropStorage.Layout storage) {
        return DropStorage.getLayout();
    }
}
