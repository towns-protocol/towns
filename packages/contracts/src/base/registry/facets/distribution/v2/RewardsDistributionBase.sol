// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IRewardsDistributionBase} from "./IRewardsDistribution.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";

// libraries
import {CustomRevert} from "../../../../../utils/libraries/CustomRevert.sol";
import {SpaceDelegationStorage} from "../../delegation/SpaceDelegationStorage.sol";
import {NodeOperatorStatus, NodeOperatorStorage} from "../../operator/NodeOperatorStorage.sol";
import {RewardsDistributionStorage} from "./RewardsDistributionStorage.sol";
import {StakingRewards} from "./StakingRewards.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";
import {LibClone} from "solady/utils/LibClone.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {SignatureCheckerLib} from "solady/utils/SignatureCheckerLib.sol";

// contracts
import {DelegationProxy} from "./DelegationProxy.sol";

abstract contract RewardsDistributionBase is IRewardsDistributionBase {
    using CustomRevert for bytes4;
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.UintSet;
    using SafeTransferLib for address;
    using StakingRewards for StakingRewards.Layout;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           STAKING                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Creates a new staking deposit for the specified owner
    /// @dev Validates delegatee, deploys proxy, transfers tokens, and updates accounting
    /// @param amount Amount of stake tokens to deposit
    /// @param delegatee Address to delegate to (operator or space)
    /// @param beneficiary Address that receives staking rewards
    /// @param owner Address that owns the deposit
    /// @return depositId The unique ID for this deposit
    function _stake(
        uint96 amount,
        address delegatee,
        address beneficiary,
        address owner
    ) internal returns (uint256 depositId) {
        _revertIfNotOperatorOrSpace(delegatee);

        RewardsDistributionStorage.Layout storage ds = RewardsDistributionStorage.layout();
        depositId = ds.staking.stake(
            owner,
            amount,
            delegatee,
            beneficiary,
            _getCommissionRate(delegatee)
        );

        _sweepSpaceRewardsIfNecessary(delegatee);

        if (owner != address(this)) {
            address proxy = _deployDelegationProxy(depositId, delegatee);
            ds.staking.stakeToken.safeTransferFrom(msg.sender, proxy, amount);
        }
        ds.depositsByDepositor[owner].add(depositId);

        emit Stake(owner, delegatee, beneficiary, depositId, amount);
    }

    /// @notice Increases the stake amount for an existing deposit
    /// @dev Validates ownership, transfers additional tokens, and updates deposit accounting
    /// @param depositId The ID of the existing deposit to increase
    /// @param amount Additional amount of stake tokens to add
    function _increaseStake(uint256 depositId, uint96 amount) internal {
        RewardsDistributionStorage.Layout storage ds = RewardsDistributionStorage.layout();
        StakingRewards.Deposit storage deposit = ds.staking.depositById[depositId];
        address owner = deposit.owner;
        _revertIfNotDepositOwner(owner);

        address delegatee = deposit.delegatee;
        _revertIfNotOperatorOrSpace(delegatee);

        ds.staking.increaseStake(
            deposit,
            owner,
            amount,
            delegatee,
            deposit.beneficiary,
            _getCommissionRate(delegatee)
        );

        _sweepSpaceRewardsIfNecessary(delegatee);

        if (owner != address(this)) {
            address proxy = ds.proxyById[depositId];
            ds.staking.stakeToken.safeTransferFrom(msg.sender, proxy, amount);
        }

        emit IncreaseStake(depositId, amount);
    }

    /// @dev Calls the `permit` function of the stake token
    function _permitStakeToken(
        uint96 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal {
        address stakeToken = RewardsDistributionStorage.layout().staking.stakeToken;

        bytes4 selector = IERC20Permit.permit.selector;
        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(fmp, selector)
            mstore(add(fmp, 0x04), caller())
            mstore(add(fmp, 0x24), address())
            mstore(add(fmp, 0x44), amount)
            mstore(add(fmp, 0x64), deadline)
            mstore(add(fmp, 0x84), v)
            mstore(add(fmp, 0xa4), r)
            mstore(add(fmp, 0xc4), s)
            if iszero(call(gas(), stakeToken, 0, fmp, 0xe4, 0, 0)) {
                returndatacopy(0, 0, returndatasize())
                revert(0, returndatasize())
            }
        }
    }

    /// @dev Deploys a beacon proxy for the delegation
    function _deployDelegationProxy(
        uint256 depositId,
        address delegatee
    ) internal returns (address proxy) {
        RewardsDistributionStorage.Layout storage ds = RewardsDistributionStorage.layout();
        proxy = LibClone.deployDeterministicERC1967BeaconProxy(address(this), bytes32(depositId));
        ds.proxyById[depositId] = proxy;
        DelegationProxy(proxy).initialize(ds.staking.stakeToken, delegatee);

        emit DelegationProxyDeployed(depositId, delegatee, proxy);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          OPERATOR                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @dev Returns the commission rate of the operator or space
    function _getCommissionRate(address delegatee) internal view returns (uint256) {
        // if the delegatee is a space, get the active operator or revert
        if (_isSpace(delegatee)) {
            delegatee = _getValidOperatorOrRevert(delegatee);
        }
        NodeOperatorStorage.Layout storage nos = NodeOperatorStorage.layout();
        return nos.commissionByOperator[delegatee];
    }

    /// @dev Checks if the delegatee is an operator
    function _isOperator(address delegatee) internal view returns (bool) {
        NodeOperatorStorage.Layout storage nos = NodeOperatorStorage.layout();
        return nos.operators.contains(delegatee);
    }

    /// @dev Checks if the delegatee is an active operator
    function _isValidOperator(address delegatee) internal view returns (bool) {
        NodeOperatorStorage.Layout storage nos = NodeOperatorStorage.layout();
        if (!nos.operators.contains(delegatee)) return false;
        NodeOperatorStatus status = nos.statusByOperator[delegatee];
        return status == NodeOperatorStatus.Approved || status == NodeOperatorStatus.Active;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      SPACE DELEGATION                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @dev Sweeps the rewards in the space delegation to the operator if necessary
    function _sweepSpaceRewardsIfNecessary(address space) internal {
        address operator = _getOperatorBySpace(space);
        if (operator == address(0)) return;

        StakingRewards.Layout storage staking = RewardsDistributionStorage.layout().staking;
        uint256 scaledReward = staking.transferReward(space, operator);

        if (scaledReward != 0) emit SpaceRewardsSwept(space, operator, scaledReward);
    }

    /// @dev Checks if the delegatee is a space
    function _isSpace(address delegatee) internal view returns (bool) {
        return _getOperatorBySpace(delegatee) != address(0);
    }

    /// @dev Returns the operator of the space
    function _getOperatorBySpace(address space) internal view returns (address operator) {
        SpaceDelegationStorage.Layout storage sd = SpaceDelegationStorage.layout();
        operator = sd.operatorBySpace[space];
    }

    /// @dev Returns the active operator of the space or reverts
    function _getValidOperatorOrRevert(address space) internal view returns (address operator) {
        operator = _getOperatorBySpace(space);
        if (!_isValidOperator(operator)) {
            RewardsDistribution__NotActiveOperator.selector.revertWith();
        }
    }

    function _currentSpaceDelegationReward(address operator) internal view returns (uint256 total) {
        StakingRewards.Layout storage staking = RewardsDistributionStorage.layout().staking;
        address[] memory spaces = SpaceDelegationStorage
            .layout()
            .spacesByOperator[operator]
            .values();

        uint256 currentRewardPerTokenAccumulated = staking.currentRewardPerTokenAccumulated();
        uint256 rewardPerTokenGrowth;
        for (uint256 i; i < spaces.length; ++i) {
            StakingRewards.Treasure storage treasure = staking.treasureByBeneficiary[spaces[i]];
            unchecked {
                rewardPerTokenGrowth =
                    currentRewardPerTokenAccumulated -
                    treasure.rewardPerTokenAccumulated;
            }
            total +=
                treasure.unclaimedRewardSnapshot +
                (uint256(treasure.earningPower) * rewardPerTokenGrowth);
        }
        total /= StakingRewards.SCALE_FACTOR;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        SANITY CHECKS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @dev Reverts if the delegatee is not an operator or space
    function _revertIfNotOperatorOrSpace(address delegatee) internal view {
        if (_isSpace(delegatee)) return;
        if (!_isValidOperator(delegatee)) {
            RewardsDistribution__NotOperatorOrSpace.selector.revertWith();
        }
    }

    /// @dev Reverts if the caller is not the owner of the deposit
    function _revertIfNotDepositOwner(address owner) internal view {
        if (msg.sender != owner) RewardsDistribution__NotDepositOwner.selector.revertWith();
    }

    /// @dev Checks if the caller is the claimer of the operator
    function _revertIfNotOperatorClaimer(address operator) internal view {
        NodeOperatorStorage.Layout storage nos = NodeOperatorStorage.layout();
        address claimer = nos.claimerByOperator[operator];
        if (msg.sender != claimer) RewardsDistribution__NotClaimer.selector.revertWith();
    }

    function _revertIfPastDeadline(uint256 deadline) internal view {
        if (block.timestamp > deadline) RewardsDistribution__ExpiredDeadline.selector.revertWith();
    }

    function _revertIfSignatureIsNotValidNow(
        address signer,
        bytes32 hash,
        bytes calldata signature
    ) internal view {
        if (!SignatureCheckerLib.isValidSignatureNowCalldata(signer, hash, signature)) {
            RewardsDistribution__InvalidSignature.selector.revertWith();
        }
    }
}
