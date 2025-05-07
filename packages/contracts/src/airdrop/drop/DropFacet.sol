// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDropFacet} from "src/airdrop/drop/IDropFacet.sol";
import {IRewardsDistribution} from "src/base/registry/facets/distribution/v2/IRewardsDistribution.sol";

// libraries

import {DropClaimLib} from "src/airdrop/drop/DropClaimLib.sol";
import {DropFacetLib} from "src/airdrop/drop/DropFacetLib.sol";
import {CurrencyTransfer} from "src/utils/libraries/CurrencyTransfer.sol";
import {SafeCastLib} from "solady/utils/SafeCastLib.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";
import {TownsPointsStorage} from "src/airdrop/points/TownsPointsStorage.sol";

contract DropFacet is IDropFacet, OwnableBase, Facet {
    using DropFacetLib for DropFacetLib.Layout;
    using DropClaimLib for DropClaimLib.ClaimCondition;

    function __DropFacet_init(address rewardsDistribution) external onlyInitializing {
        _addInterface(type(IDropFacet).interfaceId);
        __DropFacet_init_unchained(rewardsDistribution);
    }

    function __DropFacet_init_unchained(address rewardsDistribution) internal {
        DropFacetLib.getLayout().setRewardsDistribution(rewardsDistribution);
    }

    ///@inheritdoc IDropFacet
    function claimWithPenalty(
        DropClaimLib.Claim calldata claim,
        uint16 expectedPenaltyBps
    ) external returns (uint256 amount) {
        DropClaimLib.ClaimCondition storage condition = DropFacetLib
            .getLayout()
            .getClaimConditionById(claim.conditionId);

        DropClaimLib.SupplyClaim storage claimed = DropFacetLib
            .getLayout()
            .getSupplyClaimedByWallet(claim.conditionId, claim.account);

        condition.verifyClaim(claimed, claim);
        amount = condition.verifyPenaltyBps(claim, expectedPenaltyBps);

        condition.updateClaim(claimed, amount);

        TownsPointsStorage.Layout storage points = TownsPointsStorage.layout();
        points.inner.burn(claim.account, claim.points);

        CurrencyTransfer.safeTransferERC20(
            condition.currency,
            address(this),
            claim.account,
            amount
        );

        emit DropFacet_Claimed_WithPenalty(claim.conditionId, msg.sender, claim.account, amount);

        return amount;
    }

    function claimAndStake(
        DropClaimLib.Claim calldata claim,
        address delegatee,
        uint256 deadline,
        bytes calldata signature
    ) external returns (uint256) {
        DropClaimLib.ClaimCondition storage condition = DropFacetLib
            .getLayout()
            .getClaimConditionById(claim.conditionId);

        DropClaimLib.SupplyClaim storage claimed = DropFacetLib
            .getLayout()
            .getSupplyClaimedByWallet(claim.conditionId, claim.account);

        condition.verifyClaim(claimed, claim);
        condition.updateClaim(claimed, claim.quantity);

        TownsPointsStorage.Layout storage points = TownsPointsStorage.layout();
        points.inner.burn(claim.account, claim.points);

        DropFacetLib.getLayout().approveClaimToken(condition, claim.quantity);

        uint256 depositId = IRewardsDistribution(DropFacetLib.getLayout().rewardsDistribution)
            .stakeOnBehalf(
                SafeCastLib.toUint96(claim.quantity),
                delegatee,
                claim.account,
                claim.account,
                deadline,
                signature
            );

        DropFacetLib.updateDepositId(claimed, depositId);

        emit DropFacet_Claimed_And_Staked(
            claim.conditionId,
            msg.sender,
            claim.account,
            claim.quantity
        );

        return claim.quantity;
    }

    ///@inheritdoc IDropFacet
    function setClaimConditions(
        DropClaimLib.ClaimCondition[] calldata conditions
    ) external onlyOwner {
        DropFacetLib.getLayout().setClaimConditions(conditions);
    }

    ///@inheritdoc IDropFacet
    function addClaimCondition(DropClaimLib.ClaimCondition calldata condition) external onlyOwner {
        DropFacetLib.getLayout().addClaimCondition(condition);
    }

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
}
