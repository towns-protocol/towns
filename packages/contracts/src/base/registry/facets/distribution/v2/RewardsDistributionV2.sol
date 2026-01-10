// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IRewardsDistribution} from "./IRewardsDistribution.sol";

// libraries
import {CustomRevert} from "../../../../../utils/libraries/CustomRevert.sol";
import {RewardsDistributionStorage} from "./RewardsDistributionStorage.sol";
import {StakingRewards} from "./StakingRewards.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";

// contracts
import {UpgradeableBeaconBase} from "../../../../../diamond/facets/beacon/UpgradeableBeacon.sol";
import {MainnetDelegationBase} from "../../mainnet/MainnetDelegationBase.sol";
import {DelegationProxy} from "./DelegationProxy.sol";
import {RewardsDistributionBase} from "./RewardsDistributionBase.sol";
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";
import {Nonces} from "@towns-protocol/diamond/src/utils/Nonces.sol";
import {EIP712Base} from "@towns-protocol/diamond/src/utils/cryptography/EIP712Base.sol";

contract RewardsDistributionV2 is
    IRewardsDistribution,
    RewardsDistributionBase,
    MainnetDelegationBase,
    OwnableBase,
    UpgradeableBeaconBase,
    EIP712Base,
    Nonces,
    Facet
{
    using CustomRevert for bytes4;
    using EnumerableSet for EnumerableSet.UintSet;
    using SafeTransferLib for address;
    using StakingRewards for StakingRewards.Layout;

    bytes32 internal constant STAKE_TYPEHASH =
        keccak256(
            "Stake(uint96 amount,address delegatee,address beneficiary,address owner,uint256 nonce,uint256 deadline)"
        );

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       ADMIN FUNCTIONS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function __RewardsDistribution_init(
        address stakeToken,
        address rewardToken,
        uint256 rewardDuration
    ) external onlyInitializing {
        RewardsDistributionStorage.Layout storage ds = RewardsDistributionStorage.layout();
        StakingRewards.Layout storage staking = ds.staking;
        (staking.stakeToken, staking.rewardToken, staking.rewardDuration) = (
            stakeToken,
            rewardToken,
            rewardDuration
        );
        __UpgradeableBeacon_init_unchained(address(new DelegationProxy()));

        uint256 nextDepositId = staking.nextDepositId;
        for (uint256 i; i < nextDepositId; ++i) {
            address proxy = ds.proxyById[i];
            if (proxy != address(0)) DelegationProxy(proxy).reinitialize(stakeToken);
        }

        emit RewardsDistributionInitialized(stakeToken, rewardToken, rewardDuration);
    }

    /// @inheritdoc IRewardsDistribution
    function upgradeDelegationProxy(address newImplementation) external onlyOwner {
        _setImplementation(newImplementation);
    }

    /// @inheritdoc IRewardsDistribution
    function setRewardNotifier(address notifier, bool enabled) external onlyOwner {
        RewardsDistributionStorage.layout().isRewardNotifier[notifier] = enabled;

        emit RewardNotifierSet(notifier, enabled);
    }

    /// @inheritdoc IRewardsDistribution
    function setPeriodRewardAmount(uint256 amount) external onlyOwner {
        RewardsDistributionStorage.layout().periodRewardAmount = amount;

        emit PeriodRewardAmountSet(amount);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       STATE MUTATING                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IRewardsDistribution
    function stake(
        uint96 amount,
        address delegatee,
        address beneficiary
    ) external returns (uint256 depositId) {
        depositId = _stake(amount, delegatee, beneficiary, msg.sender, false);
    }

    /// @inheritdoc IRewardsDistribution
    function permitAndStake(
        uint96 amount,
        address delegatee,
        address beneficiary,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external returns (uint256 depositId) {
        _permitStakeToken(amount, nonce, deadline, signature);
        depositId = _stake(amount, delegatee, beneficiary, msg.sender, true);
    }

    /// @inheritdoc IRewardsDistribution
    function stakeOnBehalf(
        uint96 amount,
        address delegatee,
        address beneficiary,
        address owner,
        uint256,
        bytes calldata
    ) external returns (uint256 depositId) {
        _revertIfInvalidOwner(owner);
        depositId = _stake(amount, delegatee, beneficiary, owner, false);
    }

    /// @inheritdoc IRewardsDistribution
    function increaseStake(uint256 depositId, uint96 amount) external {
        _increaseStake(depositId, amount, false);
    }

    /// @inheritdoc IRewardsDistribution
    function permitAndIncreaseStake(
        uint256 depositId,
        uint96 amount,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external {
        _permitStakeToken(amount, nonce, deadline, signature);
        _increaseStake(depositId, amount, true);
    }

    /// @inheritdoc IRewardsDistribution
    function redelegate(uint256 depositId, address delegatee) external {
        RewardsDistributionStorage.Layout storage ds = RewardsDistributionStorage.layout();
        StakingRewards.Deposit storage deposit = ds.staking.depositById[depositId];
        address owner = deposit.owner;

        _revertIfNotDepositOwner(owner);
        _revertIfNotOperatorOrSpace(delegatee);

        uint96 pendingWithdrawal = deposit.pendingWithdrawal;
        uint256 commissionRate = _getCommissionRate(delegatee);

        if (pendingWithdrawal == 0) {
            ds.staking.redelegate(deposit, delegatee, commissionRate);
        } else {
            ds.staking.increaseStake(
                deposit,
                owner,
                pendingWithdrawal,
                delegatee,
                deposit.beneficiary,
                commissionRate
            );
            deposit.delegatee = delegatee;
            deposit.pendingWithdrawal = 0;
        }

        _sweepSpaceRewardsIfNecessary(delegatee);

        if (owner != address(this)) {
            address proxy = ds.proxyById[depositId];
            DelegationProxy(proxy).redelegate(delegatee);
        }

        emit Redelegate(depositId, delegatee);
    }

    /// @inheritdoc IRewardsDistribution
    function changeBeneficiary(uint256 depositId, address newBeneficiary) external {
        RewardsDistributionStorage.Layout storage ds = RewardsDistributionStorage.layout();
        StakingRewards.Deposit storage deposit = ds.staking.depositById[depositId];
        _revertIfNotDepositOwner(deposit.owner);

        address delegatee = deposit.delegatee;
        _revertIfNotOperatorOrSpace(delegatee);

        ds.staking.changeBeneficiary(deposit, newBeneficiary, _getCommissionRate(delegatee));

        _sweepSpaceRewardsIfNecessary(delegatee);

        emit ChangeBeneficiary(depositId, newBeneficiary);
    }

    /// @inheritdoc IRewardsDistribution
    function initiateWithdraw(uint256 depositId) external returns (uint96 amount) {
        RewardsDistributionStorage.Layout storage ds = RewardsDistributionStorage.layout();
        StakingRewards.Deposit storage deposit = ds.staking.depositById[depositId];
        address owner = deposit.owner;
        _revertIfNotDepositOwner(owner);

        // cache the delegatee before it's set to address(0)
        address delegatee = deposit.delegatee;

        amount = ds.staking.withdraw(deposit);

        if (owner != address(this)) {
            address proxy = ds.proxyById[depositId];
            DelegationProxy(proxy).redelegate(address(0));
        } else {
            deposit.pendingWithdrawal = 0;
        }

        _sweepSpaceRewardsIfNecessary(delegatee);

        emit InitiateWithdraw(owner, depositId, amount);
    }

    /// @inheritdoc IRewardsDistribution
    function withdraw(uint256 depositId) external returns (uint96 amount) {
        RewardsDistributionStorage.Layout storage ds = RewardsDistributionStorage.layout();
        StakingRewards.Deposit storage deposit = ds.staking.depositById[depositId];
        address owner = deposit.owner;
        _revertIfNotDepositOwner(owner);

        if (owner == address(this)) {
            RewardsDistribution__CannotWithdrawFromSelf.selector.revertWith();
        }

        amount = deposit.pendingWithdrawal;
        if (amount == 0) RewardsDistribution__NoPendingWithdrawal.selector.revertWith();
        else {
            deposit.pendingWithdrawal = 0;
            address proxy = ds.proxyById[depositId];
            ds.staking.stakeToken.safeTransferFrom(proxy, owner, amount);
        }

        emit Withdraw(depositId, amount);
    }

    /// @inheritdoc IRewardsDistribution
    function claimReward(address beneficiary, address recipient) external returns (uint256 reward) {
        RewardsDistributionStorage.Layout storage ds = RewardsDistributionStorage.layout();
        // If the beneficiary is the caller (user or operator), they can claim the reward
        if (msg.sender == beneficiary) {}
        // If the caller is the authorized claimer, they can claim the reward
        else if (msg.sender == _getAuthorizedClaimer(beneficiary)) {}
        // If the beneficiary is a space, only the operator can claim the reward
        else if (_isSpace(beneficiary)) {
            // the operator may not be active but is still allowed to claim the reward
            address operator = _getOperatorBySpace(beneficiary);
            _revertIfNotOperatorClaimer(operator);
        }
        // If the beneficiary is an operator, only the claimer can claim the reward
        else if (_isOperator(beneficiary)) _revertIfNotOperatorClaimer(beneficiary);
        else RewardsDistribution__NotBeneficiary.selector.revertWith();

        reward = ds.staking.claimReward(beneficiary);
        if (reward != 0) {
            ds.staking.rewardToken.safeTransfer(recipient, reward);
        }

        emit ClaimReward(beneficiary, recipient, reward);
    }

    /// @inheritdoc IRewardsDistribution
    function notifyRewardAmount(uint256 reward) external {
        RewardsDistributionStorage.Layout storage ds = RewardsDistributionStorage.layout();
        if (!ds.isRewardNotifier[msg.sender]) {
            RewardsDistribution__NotRewardNotifier.selector.revertWith();
        }

        ds.staking.notifyRewardAmount(reward);

        emit NotifyRewardAmount(msg.sender, reward);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          GETTERS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IRewardsDistribution
    function stakingState() external view returns (StakingState memory state) {
        StakingRewards.Layout storage staking = RewardsDistributionStorage.layout().staking;
        assembly ("memory-safe") {
            // By default, memory has been implicitly allocated for `state`.
            // But we don't need this implicitly allocated memory.
            // So we just set the free memory pointer to what it was before `state` has been
            // allocated.
            mstore(0x40, state)
        }
        state = StakingState(
            staking.stakeToken,
            staking.totalStaked,
            staking.rewardDuration,
            staking.rewardEndTime,
            staking.lastUpdateTime,
            staking.rewardRate,
            staking.rewardPerTokenAccumulated,
            staking.nextDepositId
        );
    }

    /// @inheritdoc IRewardsDistribution
    function stakedByDepositor(address depositor) external view returns (uint96 amount) {
        RewardsDistributionStorage.Layout storage ds = RewardsDistributionStorage.layout();
        amount = ds.staking.stakedByDepositor[depositor];
    }

    /// @inheritdoc IRewardsDistribution
    function getDepositsByDepositor(address depositor) external view returns (uint256[] memory) {
        RewardsDistributionStorage.Layout storage ds = RewardsDistributionStorage.layout();
        return ds.depositsByDepositor[depositor].values();
    }

    /// @inheritdoc IRewardsDistribution
    function treasureByBeneficiary(
        address beneficiary
    ) external view returns (StakingRewards.Treasure memory treasure) {
        RewardsDistributionStorage.Layout storage ds = RewardsDistributionStorage.layout();
        assembly ("memory-safe") {
            mstore(0x40, treasure)
        }
        treasure = ds.staking.treasureByBeneficiary[beneficiary];
    }

    /// @inheritdoc IRewardsDistribution
    function depositById(
        uint256 depositId
    ) external view returns (StakingRewards.Deposit memory deposit) {
        RewardsDistributionStorage.Layout storage ds = RewardsDistributionStorage.layout();
        assembly ("memory-safe") {
            mstore(0x40, deposit)
        }
        deposit = ds.staking.depositById[depositId];
    }

    /// @inheritdoc IRewardsDistribution
    function delegationProxyById(uint256 depositId) external view returns (address) {
        RewardsDistributionStorage.Layout storage ds = RewardsDistributionStorage.layout();
        return ds.proxyById[depositId];
    }

    /// @inheritdoc IRewardsDistribution
    function isRewardNotifier(address notifier) external view returns (bool) {
        RewardsDistributionStorage.Layout storage ds = RewardsDistributionStorage.layout();
        return ds.isRewardNotifier[notifier];
    }

    /// @inheritdoc IRewardsDistribution
    function lastTimeRewardDistributed() external view returns (uint256) {
        RewardsDistributionStorage.Layout storage ds = RewardsDistributionStorage.layout();
        return ds.staking.lastTimeRewardDistributed();
    }

    /// @inheritdoc IRewardsDistribution
    function currentRewardPerTokenAccumulated() external view returns (uint256) {
        RewardsDistributionStorage.Layout storage ds = RewardsDistributionStorage.layout();
        return ds.staking.currentRewardPerTokenAccumulated();
    }

    /// @inheritdoc IRewardsDistribution
    function currentReward(address beneficiary) external view returns (uint256) {
        RewardsDistributionStorage.Layout storage ds = RewardsDistributionStorage.layout();
        return
            ds.staking.currentRewardScaled(ds.staking.treasureByBeneficiary[beneficiary]) /
            StakingRewards.SCALE_FACTOR;
    }

    /// @inheritdoc IRewardsDistribution
    function currentSpaceDelegationReward(address operator) external view returns (uint256) {
        return _currentSpaceDelegationReward(operator);
    }

    /// @inheritdoc IRewardsDistribution
    /// @dev Returns the implementation stored in the beacon
    /// See: https://eips.ethereum.org/EIPS/eip-1967#beacon-contract-address
    function implementation() external view returns (address result) {
        /// @solidity memory-safe-assembly
        assembly {
            result := sload(_UPGRADEABLE_BEACON_IMPLEMENTATION_SLOT)
        }
    }

    /// @inheritdoc IRewardsDistribution
    function getPeriodRewardAmount() external view returns (uint256) {
        return RewardsDistributionStorage.layout().periodRewardAmount;
    }
}
