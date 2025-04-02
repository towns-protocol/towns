// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {DropClaimLib} from "./DropClaimLib.sol";

// libraries

// contracts

interface IDropFacetBase {
    // =============================================================
    //                           Events
    // =============================================================
    event DropFacet_Claimed_WithPenalty(
        uint256 indexed conditionId,
        address indexed claimer,
        address indexed account,
        uint256 amount
    );

    event DropFacet_Claimed_And_Staked(
        uint256 indexed conditionId,
        address indexed claimer,
        address indexed account,
        uint256 amount
    );

    event DropFacet_ClaimConditionsUpdated(
        uint256 indexed conditionId, DropClaimLib.ClaimCondition[] conditions
    );

    event DropFacet_ClaimConditionAdded(
        uint256 indexed conditionId, DropClaimLib.ClaimCondition condition
    );

    // =============================================================
    //                           Errors
    // =============================================================
    error DropFacet__NoActiveClaimCondition();
    error DropFacet__MerkleRootNotSet();
    error DropFacet__QuantityMustBeGreaterThanZero();
    error DropFacet__ExceedsMaxClaimableSupply();
    error DropFacet__ClaimHasNotStarted();
    error DropFacet__AlreadyClaimed();
    error DropFacet__InvalidProof();
    error DropFacet__ClaimConditionsNotInAscendingOrder();
    error DropFacet__CannotSetClaimConditions();
    error DropFacet__ClaimHasEnded();
    error DropFacet__UnexpectedPenaltyBps();
    error DropFacet__CurrencyNotSet();
    error DropFacet__RewardsDistributionNotSet();
    error DropFacet__InsufficientBalance();
}

interface IDropFacet is IDropFacetBase {
    /// @notice Gets all claim conditions
    /// @return An array of ClaimCondition structs
    function getClaimConditions() external view returns (DropClaimLib.ClaimCondition[] memory);

    /// @notice Sets the claim conditions for the drop
    /// @param conditions An array of ClaimCondition structs defining the conditions
    function setClaimConditions(
        DropClaimLib.ClaimCondition[] calldata conditions
    ) external;

    /// @notice Adds a new claim condition
    /// @param condition The ClaimCondition struct defining the condition
    function addClaimCondition(
        DropClaimLib.ClaimCondition calldata condition
    ) external;

    /// @notice Gets the ID of the currently active claim condition
    /// @return The ID of the active claim condition
    function getActiveClaimConditionId() external view returns (uint256);

    /// @notice Retrieves a specific claim condition by its ID
    /// @param conditionId The ID of the claim condition to retrieve
    /// @return The ClaimCondition struct for the specified ID
    function getClaimConditionById(
        uint256 conditionId
    ) external view returns (DropClaimLib.ClaimCondition memory);

    /// @notice Gets the amount of tokens claimed by a specific wallet for a given condition
    /// @param account The address of the wallet to check
    /// @param conditionId The ID of the claim condition
    /// @return The number of tokens claimed by the wallet for the specified condition
    function getSupplyClaimedByWallet(
        address account,
        uint256 conditionId
    ) external view returns (uint256);

    /// @notice Gets the deposit ID of a specific wallet for a given condition
    /// @param account The address of the wallet to check
    /// @param conditionId The ID of the claim condition
    /// @return The deposit ID of the wallet for the specified condition
    function getDepositIdByWallet(
        address account,
        uint256 conditionId
    ) external view returns (uint256);

    /// @notice Claims tokens with a penalty
    /// @param claim The claim to process
    /// @param expectedPenaltyBps The expected penalty in basis points
    /// @return The amount of tokens claimed
    function claimWithPenalty(
        DropClaimLib.Claim calldata claim,
        uint16 expectedPenaltyBps
    ) external returns (uint256);

    /// @notice Claims tokens and stakes them in the staking contract
    /// @param claim The claim to process
    /// @param delegatee The address of the delegatee
    /// @param deadline The deadline for the transaction
    /// @param signature The signature of the delegatee
    /// @return The amount of tokens claimed
    function claimAndStake(
        DropClaimLib.Claim calldata claim,
        address delegatee,
        uint256 deadline,
        bytes calldata signature
    ) external returns (uint256);
}
