// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IRewardsDistributionBase} from "./IRewardsDistribution.sol";
import {ISignatureTransfer} from "@uniswap/permit2/src/interfaces/ISignatureTransfer.sol";

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

    /// @notice Universal Permit2 contract address
    address internal constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           STAKING                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Creates a new staking deposit for the specified owner
    /// @dev Validates delegatee, deploys proxy, transfers tokens, and updates accounting
    /// @param amount Amount of stake tokens to deposit
    /// @param delegatee Address to delegate to (operator or space)
    /// @param beneficiary Address that receives staking rewards
    /// @param owner Address that owns the deposit
    /// @param fromPermit Whether tokens are already in contract from permit
    /// @return depositId The unique ID for this deposit
    function _stake(
        uint96 amount,
        address delegatee,
        address beneficiary,
        address owner,
        bool fromPermit
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
            if (!fromPermit) {
                ds.staking.stakeToken.safeTransferFrom(msg.sender, proxy, amount);
            } else {
                ds.staking.stakeToken.safeTransfer(proxy, amount);
            }
        }
        ds.depositsByDepositor[owner].add(depositId);

        emit Stake(owner, delegatee, beneficiary, depositId, amount);
    }

    /// @notice Increases the stake amount for an existing deposit
    /// @dev Validates ownership, transfers additional tokens, and updates deposit accounting
    /// @param depositId The ID of the existing deposit to increase
    /// @param amount Additional amount of stake tokens to add
    /// @param fromPermit Whether tokens are already in contract from permit
    function _increaseStake(uint256 depositId, uint96 amount, bool fromPermit) internal {
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
            if (!fromPermit) {
                ds.staking.stakeToken.safeTransferFrom(msg.sender, proxy, amount);
            } else {
                ds.staking.stakeToken.safeTransfer(proxy, amount);
            }
        }

        emit IncreaseStake(depositId, amount);
    }

    /**
     * @notice Executes a Permit2 transfer using signed permit for stake token authorization
     * @dev This function uses Uniswap's Permit2 protocol instead of EIP-2612 to enable
     * smart contract wallet support through ERC-1271 signature verification.
     *
     * Design Principles:
     * - Uses `permitTransferFrom` (not `permitWitnessTransferFrom`) since staking doesn't
     *   require binding signatures to additional contract-specific parameters
     * - Transfers tokens directly from caller to RewardsDistribution contract address
     * - Supports both EOA signatures (via ecrecover) and smart contract signatures (via ERC-1271)
     * - Towns token gives Permit2 infinite allowance by default, so no pre-approval needed
     *
     * Security Considerations:
     * - Front-running protection: The permit signature cryptographically binds the owner
     *   field to `msg.sender`. An attacker cannot use someone else's permit signature
     *   because the signature verification will fail when called by a different address.
     * - The beneficiary parameter can be specified by the caller, but the attacker cannot
     *   execute the permit without being the original signer, so no funds can be stolen.
     * - Users must have pre-approved tokens to Permit2 contract before calling this function.
     *
     * @param amount The amount of stake tokens to transfer
     * @param nonce The unique nonce for this permit to prevent replay attacks
     * @param deadline The deadline after which the permit expires
     * @param signature The signature authorizing the transfer (supports both EOA and smart contract wallets)
     */
    function _permitStakeToken(
        uint96 amount,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) internal {
        address stakeToken = RewardsDistributionStorage.layout().staking.stakeToken;

        // execute permit transfer from the caller to this contract via Permit2
        ISignatureTransfer(PERMIT2).permitTransferFrom(
            ISignatureTransfer.PermitTransferFrom(
                ISignatureTransfer.TokenPermissions(stakeToken, amount),
                nonce,
                deadline
            ),
            ISignatureTransfer.SignatureTransferDetails({
                to: address(this),
                requestedAmount: amount
            }),
            msg.sender, // owner has to be the caller
            signature
        );
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
