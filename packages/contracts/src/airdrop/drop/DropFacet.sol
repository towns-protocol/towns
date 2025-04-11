// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDropFacet} from "src/airdrop/drop/IDropFacet.sol";
import {IRewardsDistribution} from "src/base/registry/facets/distribution/v2/IRewardsDistribution.sol";

// libraries
import {DropClaimLib} from "src/airdrop/drop/DropClaimLib.sol";
import {DropFacetLib} from "src/airdrop/drop/DropFacetLib.sol";
import {CurrencyTransfer} from "src/utils/libraries/CurrencyTransfer.sol";
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";
import {SafeCastLib} from "solady/utils/SafeCastLib.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";

contract DropFacet is IDropFacet, OwnableBase, Facet {
    using DropFacetLib for DropFacetLib.Layout;
    using DropClaimLib for DropClaimLib.ClaimCondition;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       ADMIN FUNCTIONS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function __DropFacet_init(
        address rewardsDistribution,
        uint48 minLockDuration,
        uint48 maxLockDuration
    ) external onlyInitializing {
        __DropFacet_init_unchained(rewardsDistribution, minLockDuration, maxLockDuration);
    }

    function __DropFacet_init_unchained(
        address rewardsDistribution,
        uint48 minLockDuration,
        uint48 maxLockDuration
    ) internal {
        if (rewardsDistribution == address(0)) {
            CustomRevert.revertWith(DropFacet__RewardsDistributionNotSet.selector);
        }

        DropFacetLib.Layout storage ds = DropFacetLib.getLayout();
        (ds.rewardsDistribution, ds.minLockDuration, ds.maxLockDuration) = (
            rewardsDistribution,
            minLockDuration,
            maxLockDuration
        );
    }

    /// @inheritdoc IDropFacet
    function setClaimConditions(
        DropClaimLib.ClaimCondition[] calldata conditions
    ) external onlyOwner {
        DropFacetLib.getLayout().setClaimConditions(conditions);
    }

    /// @inheritdoc IDropFacet
    function addClaimCondition(DropClaimLib.ClaimCondition calldata condition) external onlyOwner {
        DropFacetLib.getLayout().addClaimCondition(condition);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                            CLAIM                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IDropFacet
    // TODO: rename
    function claimWithPenalty(
        DropClaimLib.Claim calldata claim,
        uint16 expectedPenaltyBps
    ) external returns (uint256 amount) {
        DropFacetLib.Layout storage self = DropFacetLib.getLayout();
        DropClaimLib.ClaimCondition storage condition = self.getClaimConditionById(
            claim.conditionId
        );

        DropClaimLib.SupplyClaim storage claimed = self.getSupplyClaimedByWallet(
            claim.conditionId,
            claim.account
        );

        condition.verifyClaim(claimed, claim);
        amount = condition.verifyPenaltyBps(claim.quantity, expectedPenaltyBps);

        condition.updateClaim(claimed, amount);

        CurrencyTransfer.safeTransferERC20(
            condition.currency,
            address(this),
            claim.account,
            amount
        );

        emit DropFacet_Claimed_WithPenalty(claim.conditionId, msg.sender, claim.account, amount);
    }

    /// @inheritdoc IDropFacet
    function claimAndStake(
        DropClaimLib.Claim calldata claim,
        address delegatee,
        uint48 lockDuration
    ) external returns (uint256 amount) {
        DropFacetLib.Layout storage self = DropFacetLib.getLayout();
        self.verifyLockDuration(lockDuration);

        DropClaimLib.ClaimCondition storage condition = self.getClaimConditionById(
            claim.conditionId
        );

        DropClaimLib.SupplyClaim storage claimed = self.getSupplyClaimedByWallet(
            claim.conditionId,
            claim.account
        );

        condition.verifyClaim(claimed, claim);

        amount = condition.lockToBoost(claimed, claim.quantity, self.maxLockDuration, lockDuration);

        condition.updateClaim(claimed, amount);
        self.approveClaimToken(condition, amount);

        uint256 depositId = IRewardsDistribution(self.rewardsDistribution).stakeOnBehalf(
            SafeCastLib.toUint96(amount),
            delegatee,
            claim.account,
            address(this),
            0,
            ""
        );

        DropFacetLib.updateDepositId(claimed, depositId);

        emit DropFacet_Claimed_And_Staked(claim.conditionId, msg.sender, claim.account, amount);
    }

    /// @inheritdoc IDropFacet
    function unlockStake(uint256 conditionId) external {
        DropFacetLib.Layout storage self = DropFacetLib.getLayout();
        DropClaimLib.SupplyClaim storage claimed = self.getSupplyClaimedByWallet(
            conditionId,
            msg.sender
        );
        uint256 unlockTime = claimed.lockStart + claimed.lockDuration;
        if (block.timestamp < unlockTime) {
            CustomRevert.revertWith(DropFacet__StakeNotUnlocked.selector);
        }

        IRewardsDistribution(self.rewardsDistribution).changeDepositOwner(
            claimed.depositId,
            msg.sender
        );

        emit DropFacet_Unlocked_Stake(conditionId, msg.sender);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          GETTERS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    ///@inheritdoc IDropFacet
    function getActiveClaimConditionId() external view returns (uint256) {
        return DropFacetLib.getLayout().getActiveConditionId();
    }

    ///@inheritdoc IDropFacet
    function getClaimConditions() external view returns (DropClaimLib.ClaimCondition[] memory) {
        return DropFacetLib.getLayout().getClaimConditions();
    }

    ///@inheritdoc IDropFacet
    function getClaimConditionById(
        uint256 conditionId
    ) external view returns (DropClaimLib.ClaimCondition memory condition) {
        assembly ("memory-safe") {
            // By default, memory has been implicitly allocated for `condition`.
            // But we don't need this implicitly allocated memory.
            // So we just set the free memory pointer to what it was before `condition` has been
            // allocated.
            mstore(0x40, condition)
        }

        condition = DropFacetLib.getLayout().getClaimConditionById(conditionId);
    }

    ///@inheritdoc IDropFacet
    function getSupplyClaimedByWallet(
        address account,
        uint256 conditionId
    ) external view returns (uint256) {
        return DropFacetLib.getLayout().getSupplyClaimedByWallet(conditionId, account).claimed;
    }

    ///@inheritdoc IDropFacet
    function getDepositIdByWallet(
        address account,
        uint256 conditionId
    ) external view returns (uint256) {
        return DropFacetLib.getLayout().getSupplyClaimedByWallet(conditionId, account).depositId;
    }

    /// @inheritdoc IDropFacet
    function getUnlockTime(address account, uint256 conditionId) external view returns (uint256) {
        DropClaimLib.SupplyClaim storage supplyClaim = DropFacetLib
            .getLayout()
            .getSupplyClaimedByWallet(conditionId, account);
        return supplyClaim.lockStart + supplyClaim.lockDuration;
    }
}
