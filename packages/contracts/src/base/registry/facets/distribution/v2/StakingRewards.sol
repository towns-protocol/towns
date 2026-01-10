// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

// interfaces
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// libraries
import {CustomRevert} from "../../../../../utils/libraries/CustomRevert.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";

// contracts

/// @notice Staking rewards library that encapsulates the minimal logic for staking and rewards
/// distribution with delegation commission
/// @dev The library does not handle the transfer of stakeToken and rewardToken.
/// @dev The library is designed to be compatible with ERC-7201.
/// @dev The data structures should be modified with caution.
library StakingRewards {
    using CustomRevert for bytes4;

    /// @notice The deposit information
    /// @param amount The amount of stakeToken that is staked
    /// @param owner The address of the depositor
    /// @param commissionEarningPower The amount of stakeToken assigned to the commission
    /// @param delegatee The address of the delegatee
    /// @param pendingWithdrawal The amount of stakeToken that is pending withdrawal
    /// @param beneficiary The address of the beneficiary
    struct Deposit {
        uint96 amount;
        address owner;
        uint96 commissionEarningPower;
        address delegatee;
        uint96 pendingWithdrawal;
        address beneficiary;
    }

    /// @notice The account information for a beneficiary
    /// @param earningPower The amount of stakeToken that is yielding rewards
    /// @param rewardPerTokenAccumulated The scaled amount of rewardToken that has been accumulated
    /// per staked token
    /// @param unclaimedRewardSnapshot The snapshot of the unclaimed reward scaled
    struct Treasure {
        uint96 earningPower;
        uint256 rewardPerTokenAccumulated;
        uint256 unclaimedRewardSnapshot;
    }

    /// @notice The layout of the staking rewards storage
    /// @param rewardToken The token that is being distributed as rewards
    /// @param stakeToken The token that is being staked
    /// @param totalStaked The total amount of stakeToken that is staked
    /// @param rewardDuration The duration of the reward distribution
    /// @param rewardEndTime The time at which the reward distribution ends
    /// @param lastUpdateTime The time at which the reward was last updated
    /// @param rewardRate The scaled rate of reward distributed per second
    /// @param rewardPerTokenAccumulated The scaled amount of rewardToken that has been accumulated
    /// per staked token
    /// @param nextDepositId The next deposit ID that will be used
    /// @param stakedByDepositor The mapping of the amount of stakeToken that is staked by a
    /// particular depositor
    /// @param treasureByBeneficiary The mapping of the account information for a beneficiary
    /// @param depositById The mapping of the information for a deposit
    struct Layout {
        address rewardToken;
        address stakeToken;
        uint96 totalStaked;
        uint256 rewardDuration;
        uint256 rewardEndTime;
        uint256 lastUpdateTime;
        uint256 rewardRate;
        uint256 rewardPerTokenAccumulated;
        uint256 nextDepositId;
        mapping(address depositor => uint96 amount) stakedByDepositor;
        mapping(address beneficiary => Treasure) treasureByBeneficiary;
        mapping(uint256 depositId => Deposit) depositById;
    }

    uint256 internal constant SCALE_FACTOR = 1e36;
    uint256 internal constant MAX_COMMISSION_RATE = 10_000;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       CUSTOM ERRORS                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    error StakingRewards__InvalidAmount();
    error StakingRewards__InvalidAddress();
    error StakingRewards__InvalidRewardRate();
    error StakingRewards__InsufficientReward();
    error StakingRewards__CommissionExceedsStake();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       STATE MUTATING                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Updates the global reward accumulation state to current timestamp
    /// @dev Must be called before any storage updates.
    function updateGlobalReward(Layout storage self) internal {
        self.rewardPerTokenAccumulated = currentRewardPerTokenAccumulated(self);
        self.lastUpdateTime = lastTimeRewardDistributed(self);
    }

    /// @notice Updates a beneficiary's reward snapshot based on current global state
    /// @dev Must be called after `updateGlobalReward` and before changing the earning power.
    function updateReward(Layout storage self, Treasure storage treasure) internal {
        treasure.unclaimedRewardSnapshot = currentRewardScaled(self, treasure);
        treasure.rewardPerTokenAccumulated = self.rewardPerTokenAccumulated;
    }

    /// @notice Creates a new stake deposit with delegation and commission
    function stake(
        Layout storage self,
        address owner,
        uint96 amount,
        address delegatee,
        address beneficiary,
        uint256 commissionRate
    ) internal returns (uint256 depositId) {
        if (amount == 0) StakingRewards__InvalidAmount.selector.revertWith();

        if (delegatee == address(0) || beneficiary == address(0)) {
            StakingRewards__InvalidAddress.selector.revertWith();
        }

        depositId = self.nextDepositId++;
        Deposit storage deposit = self.depositById[depositId];

        // batch storage writes
        (deposit.owner, deposit.beneficiary, deposit.delegatee) = (owner, beneficiary, delegatee);

        increaseStake(self, deposit, owner, amount, delegatee, beneficiary, commissionRate);
    }

    /// @notice Increases the stake amount for an existing deposit
    /// @dev Assumes `owner` is the same as `deposit.owner`
    /// @dev Assumes `delegatee` and `beneficiary` match `deposit.delegatee` and `deposit.beneficiary`
    function increaseStake(
        Layout storage self,
        Deposit storage deposit,
        address owner,
        uint96 amount,
        address delegatee,
        address beneficiary,
        uint256 commissionRate
    ) internal {
        updateGlobalReward(self);

        Treasure storage beneficiaryTreasure = self.treasureByBeneficiary[beneficiary];
        updateReward(self, beneficiaryTreasure);

        self.totalStaked += amount;
        unchecked {
            // because totalStaked >= stakedByDepositor[owner] >= deposit.amount
            // if totalStaked doesn't overflow, they won't
            self.stakedByDepositor[owner] += amount;
            deposit.amount += amount;
        }
        _increaseEarningPower(
            self,
            deposit,
            beneficiaryTreasure,
            amount,
            delegatee,
            commissionRate
        );
    }

    /// @notice Changes the delegatee for an existing deposit
    function redelegate(
        Layout storage self,
        Deposit storage deposit,
        address newDelegatee,
        uint256 commissionRate
    ) internal {
        updateGlobalReward(self);

        Treasure storage beneficiaryTreasure = self.treasureByBeneficiary[deposit.beneficiary];
        updateReward(self, beneficiaryTreasure);

        _decreaseEarningPower(self, deposit, beneficiaryTreasure);

        _increaseEarningPower(
            self,
            deposit,
            beneficiaryTreasure,
            deposit.amount,
            newDelegatee,
            commissionRate
        );

        deposit.delegatee = newDelegatee;
    }

    /// @notice Changes the beneficiary for an existing deposit
    /// @dev Assumes `commissionRate` matches the intended rate for the current delegatee
    function changeBeneficiary(
        Layout storage self,
        Deposit storage deposit,
        address newBeneficiary,
        uint256 commissionRate
    ) internal {
        if (newBeneficiary == address(0)) StakingRewards__InvalidAddress.selector.revertWith();

        updateGlobalReward(self);

        (uint96 amount, address oldBeneficiary, address delegatee) = (
            deposit.amount,
            deposit.beneficiary,
            deposit.delegatee
        );
        deposit.beneficiary = newBeneficiary;

        Treasure storage oldTreasure = self.treasureByBeneficiary[oldBeneficiary];
        updateReward(self, oldTreasure);

        _decreaseEarningPower(self, deposit, oldTreasure);

        Treasure storage newTreasure = self.treasureByBeneficiary[newBeneficiary];
        updateReward(self, newTreasure);

        _increaseEarningPower(self, deposit, newTreasure, amount, delegatee, commissionRate);
    }

    /// @notice Withdraws the full amount from a deposit and marks it for pending withdrawal
    function withdraw(Layout storage self, Deposit storage deposit) internal returns (uint96) {
        updateGlobalReward(self);

        Treasure storage beneficiaryTreasure = self.treasureByBeneficiary[deposit.beneficiary];
        updateReward(self, beneficiaryTreasure);

        // cache storage reads
        (uint96 amount, address owner) = (deposit.amount, deposit.owner);

        unchecked {
            // totalStaked >= deposit.amount
            self.totalStaked -= amount;
            // stakedByDepositor[owner] >= deposit.amount
            self.stakedByDepositor[owner] -= amount;
        }
        _decreaseEarningPower(self, deposit, beneficiaryTreasure);

        (deposit.amount, deposit.delegatee, deposit.pendingWithdrawal) = (0, address(0), amount);
        return amount;
    }

    /// @notice Claims accumulated rewards for a beneficiary
    function claimReward(
        Layout storage self,
        address beneficiary
    ) internal returns (uint256 reward) {
        updateGlobalReward(self);

        Treasure storage treasure = self.treasureByBeneficiary[beneficiary];
        updateReward(self, treasure);

        reward = treasure.unclaimedRewardSnapshot / SCALE_FACTOR;
        if (reward != 0) {
            unchecked {
                treasure.unclaimedRewardSnapshot -= reward * SCALE_FACTOR;
            }
        }
    }

    /// @notice Sets up a new reward distribution period
    /// @dev Manually updates global reward state instead of calling updateGlobalReward()
    /// since it resets the reward period timing. This function combines reward index update
    /// with new period setup in a single operation.
    /// @param self The staking rewards storage layout
    /// @param reward The additional amount of rewards to distribute over the reward duration
    function notifyRewardAmount(Layout storage self, uint256 reward) internal {
        self.rewardPerTokenAccumulated = currentRewardPerTokenAccumulated(self);

        // cache storage reads
        (uint256 rewardDuration, uint256 rewardEndTime) = (self.rewardDuration, self.rewardEndTime);

        uint256 rewardRate = FixedPointMathLib.fullMulDiv(reward, SCALE_FACTOR, rewardDuration);
        // if the reward period hasn't ended, add the remaining reward to the reward rate
        if (rewardEndTime > block.timestamp) {
            uint256 remainingTime;
            unchecked {
                remainingTime = rewardEndTime - block.timestamp;
            }
            rewardRate += FixedPointMathLib.fullMulDiv(
                self.rewardRate,
                remainingTime,
                rewardDuration
            );
        }

        // batch storage writes
        (self.rewardEndTime, self.lastUpdateTime, self.rewardRate) = (
            block.timestamp + rewardDuration,
            block.timestamp,
            rewardRate
        );

        if (rewardRate < SCALE_FACTOR) StakingRewards__InvalidRewardRate.selector.revertWith();

        if (
            FixedPointMathLib.fullMulDiv(rewardRate, rewardDuration, SCALE_FACTOR) >
            IERC20(self.rewardToken).balanceOf(address(this))
        ) StakingRewards__InsufficientReward.selector.revertWith();
    }

    /// @notice Sweeps and clears all unclaimed rewards for a beneficiary
    /// @dev Updates global rewards state and beneficiary's reward snapshot before clearing.
    /// This function removes all pending rewards without transferring them elsewhere.
    /// @param self The staking rewards storage layout
    /// @param beneficiary The beneficiary whose rewards will be swept and cleared
    /// @return sweptAmount The amount of scaled rewards that were cleared
    function sweepReward(
        Layout storage self,
        address beneficiary
    ) internal returns (uint256 sweptAmount) {
        updateGlobalReward(self);

        Treasure storage treasure = self.treasureByBeneficiary[beneficiary];
        updateReward(self, treasure);

        sweptAmount = treasure.unclaimedRewardSnapshot;
        treasure.unclaimedRewardSnapshot = 0;
    }

    /// @notice Transfers all unclaimed rewards from one beneficiary to another
    /// @dev Sweeps rewards from source beneficiary and transfers them to destination
    /// @param self The staking rewards storage layout
    /// @param from The beneficiary to transfer rewards from
    /// @param to The beneficiary to transfer rewards to
    /// @return transferredAmount The amount of scaled rewards transferred
    function transferReward(
        Layout storage self,
        address from,
        address to
    ) internal returns (uint256 transferredAmount) {
        // sweep and clear rewards from source beneficiary
        transferredAmount = sweepReward(self, from);
        if (transferredAmount == 0) return 0;

        // transfer swept rewards to destination beneficiary
        Treasure storage toTreasure = self.treasureByBeneficiary[to];
        // no updateReward needed: reward math is associative, pending rewards
        // will be correctly calculated on next updateReward call
        toTreasure.unclaimedRewardSnapshot += transferredAmount;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          VIEWERS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Gets the last time rewards were distributed (capped at current timestamp)
    function lastTimeRewardDistributed(Layout storage self) internal view returns (uint256) {
        return FixedPointMathLib.min(self.rewardEndTime, block.timestamp);
    }

    /// @notice Calculates the current accumulated reward per token
    function currentRewardPerTokenAccumulated(Layout storage self) internal view returns (uint256) {
        // cache storage reads
        (
            uint96 totalStaked,
            uint256 lastUpdateTime,
            uint256 rewardRate,
            uint256 rewardPerTokenAccumulated
        ) = (
                self.totalStaked,
                self.lastUpdateTime,
                self.rewardRate,
                self.rewardPerTokenAccumulated
            );
        if (totalStaked == 0) return rewardPerTokenAccumulated;

        uint256 elapsedTime;
        unchecked {
            elapsedTime = lastTimeRewardDistributed(self) - lastUpdateTime;
        }
        return
            rewardPerTokenAccumulated +
            FixedPointMathLib.fullMulDiv(rewardRate, elapsedTime, totalStaked);
    }

    /// @notice Calculates current scaled reward for a beneficiary's treasure
    function currentRewardScaled(
        Layout storage self,
        Treasure storage treasure
    ) internal view returns (uint256) {
        uint256 rewardPerTokenGrowth;
        unchecked {
            rewardPerTokenGrowth =
                currentRewardPerTokenAccumulated(self) -
                treasure.rewardPerTokenAccumulated;
        }
        return
            treasure.unclaimedRewardSnapshot +
            (uint256(treasure.earningPower) * rewardPerTokenGrowth);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         ACCOUNTING                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @dev Increases the earning power of the beneficiary and the delegatee, taking into account
    /// the commission rate
    /// @dev Must be called after `updateReward(self, beneficiaryTreasure)`
    /// @dev Assumes `beneficiaryTreasure` corresponds to the deposit's current beneficiary
    /// @dev Invariant: deposit.amount >= deposit.commissionEarningPower
    /// This is maintained because commission rate <= MAX_COMMISSION_RATE
    function _increaseEarningPower(
        Layout storage self,
        Deposit storage deposit,
        Treasure storage beneficiaryTreasure,
        uint96 amount,
        address delegatee,
        uint256 commissionRate
    ) private {
        unchecked {
            if (commissionRate == 0) {
                beneficiaryTreasure.earningPower += amount;
            } else {
                uint96 commissionEarningPower = uint96(
                    (uint256(amount) * commissionRate) / MAX_COMMISSION_RATE
                );
                deposit.commissionEarningPower += commissionEarningPower;
                beneficiaryTreasure.earningPower += amount - commissionEarningPower;

                Treasure storage delegateeTreasure = self.treasureByBeneficiary[delegatee];
                updateReward(self, delegateeTreasure);
                delegateeTreasure.earningPower += commissionEarningPower;
            }
        }
    }

    /// @dev Decreases the earning power of the beneficiary and the delegatee, taking into account
    /// the commission rate
    /// @dev Must be called after `updateReward(self, beneficiaryTreasure)`
    /// @dev Assumes `beneficiaryTreasure` corresponds to the deposit's current beneficiary
    function _decreaseEarningPower(
        Layout storage self,
        Deposit storage deposit,
        Treasure storage beneficiaryTreasure
    ) private {
        unchecked {
            (uint96 amount, uint96 commissionEarningPower, address delegatee) = (
                deposit.amount,
                deposit.commissionEarningPower,
                deposit.delegatee
            );

            // Defensive check: ensure commission earning power doesn't exceed stake amount
            // While this invariant should mathematically hold through normal operations,
            // explicit validation protects against potential bugs, storage corruption,
            // or future code changes that might violate this critical assumption
            if (commissionEarningPower > amount) {
                StakingRewards__CommissionExceedsStake.selector.revertWith();
            }

            if (commissionEarningPower == 0) {
                beneficiaryTreasure.earningPower -= amount;
            } else {
                deposit.commissionEarningPower = 0;
                beneficiaryTreasure.earningPower -= amount - commissionEarningPower;

                Treasure storage delegateeTreasure = self.treasureByBeneficiary[delegatee];
                updateReward(self, delegateeTreasure);
                delegateeTreasure.earningPower -= commissionEarningPower;
            }
        }
    }
}
