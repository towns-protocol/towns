// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IRewardsDistribution} from "../../base/registry/facets/distribution/v2/IRewardsDistribution.sol";
import {IDropFacet} from "./IDropFacet.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// libraries
import {DropClaim} from "./DropClaim.sol";
import {DropGroup} from "./DropGroup.sol";
import {DropStorage} from "./DropStorage.sol";
import {SafeCastLib} from "solady/utils/SafeCastLib.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";

// contracts
import {TownsPointsStorage} from "../points/TownsPointsStorage.sol";
import {DropBase} from "./DropBase.sol";
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";

contract DropFacet is IDropFacet, DropBase, OwnableBase, Facet {
    using DropClaim for DropClaim.Claim;
    using DropGroup for DropGroup.Layout;
    using SafeTransferLib for address;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       ADMIN FUNCTIONS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function __DropFacet_init(address rewardsDistribution) external onlyInitializing {
        _addInterface(type(IDropFacet).interfaceId);
        __DropFacet_init_unchained(rewardsDistribution);
    }

    function __DropFacet_init_unchained(address rewardsDistribution) internal {
        _setRewardsDistribution(rewardsDistribution);
    }

    /// @inheritdoc IDropFacet
    function addClaimCondition(DropGroup.ClaimCondition calldata condition) external onlyOwner {
        _addClaimCondition(condition);
    }

    /// @inheritdoc IDropFacet
    function setClaimConditions(DropGroup.ClaimCondition[] calldata conditions) external onlyOwner {
        _setClaimConditions(conditions);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          CLAIMING                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IDropFacet
    function claimWithPenalty(
        DropClaim.Claim calldata req,
        uint16 expectedPenaltyBps
    ) external returns (uint256 amount) {
        DropGroup.Layout storage drop = _getDropGroup(req.conditionId);

        amount = _deductPenalty(req.quantity, drop.condition.penaltyBps, expectedPenaltyBps);

        drop.verify(amount);

        // verify the Merkle proof of the claim
        req.verify(drop.condition.merkleRoot);

        drop.claim(req.account, amount);

        TownsPointsStorage.Layout storage points = TownsPointsStorage.layout();
        points.inner.burn(req.account, req.points);
        emit IERC20.Transfer(req.account, address(0), amount);

        drop.condition.currency.safeTransfer(req.account, amount);

        emit DropFacet_Claimed_WithPenalty(req.conditionId, msg.sender, req.account, amount);
    }

    /// @inheritdoc IDropFacet
    function claimAndStake(
        DropClaim.Claim calldata req,
        address delegatee,
        uint256 deadline,
        bytes calldata signature
    ) external returns (uint256 amount) {
        DropGroup.Layout storage drop = _getDropGroup(req.conditionId);

        amount = req.quantity;
        drop.verify(amount);

        // verify the Merkle proof of the claim
        req.verify(drop.condition.merkleRoot);

        drop.claim(req.account, amount);

        TownsPointsStorage.Layout storage points = TownsPointsStorage.layout();
        points.inner.burn(req.account, req.points);
        emit IERC20.Transfer(req.account, address(0), amount);

        _approveClaimToken(drop.condition.currency, amount);

        uint256 depositId = IRewardsDistribution(DropStorage.getLayout().rewardsDistribution)
            .stakeOnBehalf(
                SafeCastLib.toUint96(amount),
                delegatee,
                req.account,
                req.account,
                deadline,
                signature
            );

        DropGroup.Claimed storage claimed = drop.supplyClaimedByWallet[req.account];
        claimed.depositId = depositId;

        emit DropFacet_Claimed_And_Staked(req.conditionId, msg.sender, req.account, amount);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          GETTERS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IDropFacet
    function getActiveClaimConditionId() external view returns (uint256) {
        return _getActiveConditionId();
    }

    /// @inheritdoc IDropFacet
    function getClaimConditions() external view returns (DropGroup.ClaimCondition[] memory) {
        return _getClaimConditions();
    }

    /// @inheritdoc IDropFacet
    function getClaimConditionById(
        uint256 conditionId
    ) external view returns (DropGroup.ClaimCondition memory condition) {
        assembly ("memory-safe") {
            // By default, memory has been implicitly allocated for `condition`.
            // But we don't need this implicitly allocated memory.
            // So we just set the free memory pointer to what it was before `condition` has been
            // allocated.
            mstore(0x40, condition)
        }
        condition = _getClaimConditionById(conditionId);
    }

    /// @inheritdoc IDropFacet
    function getSupplyClaimedByWallet(
        address account,
        uint256 conditionId
    ) external view returns (uint256) {
        return _getSupplyClaimedByWallet(conditionId, account).amount;
    }

    /// @inheritdoc IDropFacet
    function getDepositIdByWallet(
        address account,
        uint256 conditionId
    ) external view returns (uint256) {
        return _getSupplyClaimedByWallet(conditionId, account).depositId;
    }
}
