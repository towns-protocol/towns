// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interfaces
import {IDrop} from "contracts/src/utils/interfaces/IDrop.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

// libraries

// contracts

contract Drop is IDrop {
  /// @dev The active conditions for claiming tokens
  ClaimConditionList public claimCondition;

  /// @inheritdoc IDrop
  function claim(
    address _receiver,
    uint256 _quantity,
    address _currency,
    uint256 _pricePerToken,
    AllowlistProof calldata _allowlistProof,
    bytes memory _data
  ) external payable virtual override {
    // call hook
    _beforeClaim(
      _receiver,
      _quantity,
      _currency,
      _pricePerToken,
      _allowlistProof,
      _data
    );

    // get the active claim condition id
    uint256 activeConditionId = getActiveClaimConditionId();

    // verify the claim
    verifyClaim(
      activeConditionId,
      _dropMsgSender(),
      _quantity,
      _currency,
      _pricePerToken,
      _allowlistProof
    );

    // update claim condition
    claimCondition.conditions[activeConditionId].supplyClaimed += _quantity;
    claimCondition.supplyClaimedByWallet[activeConditionId][
      _dropMsgSender()
    ] += _quantity;

    // collect price
    _collectPriceOnClaim(address(0), _quantity, _currency, _pricePerToken);

    // Mint tokens to the receiver hook
    uint256 startTokenId = _transferTokensOnClaim(_receiver, _quantity);

    // emit event
    emit TokensClaimed(
      activeConditionId,
      _dropMsgSender(),
      _receiver,
      startTokenId,
      _quantity
    );

    // call hook
    _afterClaim(
      _receiver,
      _quantity,
      _currency,
      _pricePerToken,
      _allowlistProof,
      _data
    );
  }

  /// @inheritdoc IDrop
  function setClaimConditions(
    ClaimCondition[] calldata _claimConditions,
    bool _resetEligibility
  ) external virtual override {
    // check if can set claim conditions
    if (!_canSetClaimConditions()) {
      revert("Drop: cannot set claim conditions");
    }

    // get the existing claim condition count and start id
    uint256 existingStartId = claimCondition.currentStartId;
    uint256 existingPhaseCount = claimCondition.count;

    /// @dev If the claim conditions are being reset, we assign a new uid to the claim conditions.
    /// which ends up resetting the eligibility of the claim conditions in `supplyClaimedByWallet`.
    uint256 newStartId = existingStartId;
    if (_resetEligibility) {
      newStartId = existingStartId + existingPhaseCount;
    }

    claimCondition.count = _claimConditions.length;
    claimCondition.currentStartId = newStartId;

    uint256 lastConditionTimestamp;
    for (uint256 i = 0; i < _claimConditions.length; i++) {
      require(
        i == 0 || lastConditionTimestamp < _claimConditions[i].startTimestamp,
        "Drop: claim conditions are not in ascending order"
      );

      uint256 amountAlreadyClaimed = claimCondition
        .conditions[newStartId + i]
        .supplyClaimed;

      // check that amount already claimed is less than or equal to the max claimable amount
      if (amountAlreadyClaimed > _claimConditions[i].maxClaimableSupply) {
        revert("Drop: cannot set claim conditions");
      }

      claimCondition.conditions[newStartId + i] = _claimConditions[i];
      claimCondition
        .conditions[newStartId + i]
        .supplyClaimed = amountAlreadyClaimed;

      lastConditionTimestamp = _claimConditions[i].startTimestamp;
    }

    // if _resetEligibility is true, we assign new uids to the claim conditions
    // so we delete claim conditions with UID < newStartId
    if (_resetEligibility) {
      for (uint256 i = existingStartId; i < newStartId; i++) {
        delete claimCondition.conditions[i];
      }
    } else {
      if (existingPhaseCount > _claimConditions.length) {
        for (uint256 i = _claimConditions.length; i < existingPhaseCount; i++) {
          delete claimCondition.conditions[newStartId + i];
        }
      }
    }

    emit ClaimConditionsUpdated(_claimConditions, _resetEligibility);
  }

  /// @dev Checks a request to claim token against the active claim condition's criteria.
  function verifyClaim(
    uint256 _conditionId,
    address _claimer,
    uint256 _quantity,
    address _currency,
    uint256 _pricePerToken,
    AllowlistProof calldata _allowlistProof
  ) public view returns (bool isOverride) {
    ClaimCondition memory condition = claimCondition.conditions[_conditionId];

    uint256 claimLimit = condition.limitPerWallet;
    uint256 claimPrice = condition.pricePerToken;
    address claimCurrency = condition.currency;

    // if there is a merkle root in the condition, check the allowlist proof against it
    if (condition.merkleRoot != bytes32(0)) {
      isOverride = MerkleProof.verify(
        _allowlistProof.proof,
        condition.merkleRoot,
        keccak256(
          abi.encodePacked(
            _claimer,
            _allowlistProof.limitPerWallet,
            _allowlistProof.pricePerToken,
            _allowlistProof.currency
          )
        )
      );
    }

    // if the allowlist proof is valid, override the claim limit, price, and currency
    if (isOverride) {
      claimLimit = _allowlistProof.limitPerWallet != 0
        ? _allowlistProof.limitPerWallet
        : claimLimit;
      claimPrice = _allowlistProof.pricePerToken != type(uint256).max
        ? _allowlistProof.pricePerToken
        : claimPrice;
      claimCurrency = _allowlistProof.pricePerToken != type(uint256).max &&
        _allowlistProof.currency != address(0)
        ? _allowlistProof.currency
        : claimCurrency;
    }

    uint256 supplyClaimedByWallet = claimCondition.supplyClaimedByWallet[
      _conditionId
    ][_claimer];

    // check that currency and price match the condition
    require(
      _currency == claimCurrency,
      "Drop: currency does not match claim condition"
    );

    // check that the price per token matches the condition
    require(
      _pricePerToken == claimPrice,
      "Drop: price per token does not match claim condition"
    );

    // check that the quantity is more than 0
    require(_quantity > 0, "Drop: quantity must be more than 0");

    // check that the quantity being claimed is less than or equal to the claim limit
    require(
      claimLimit >= supplyClaimedByWallet + _quantity,
      "Drop: quantity being claimed exceeds claim limit"
    );

    // check that the quantity being claimed is less than or equal to the claim limit
    require(
      condition.maxClaimableSupply >= condition.supplyClaimed + _quantity,
      "Drop: quantity being claimed exceeds claim limit"
    );

    // check that the current timestamp is more than the start timestamp
    require(
      block.timestamp >= condition.startTimestamp,
      "Drop: claim not yet available"
    );
  }

  /// @dev Returns the uid for the active claim condition
  function getActiveClaimConditionId() public view returns (uint256) {
    for (
      uint256 i = claimCondition.currentStartId + claimCondition.count;
      i > claimCondition.currentStartId;
      i--
    ) {
      if (block.timestamp >= claimCondition.conditions[i - 1].startTimestamp) {
        return i - 1;
      }
    }

    revert("Drop: no active claim condition");
  }

  /// @dev Returns the claim condition at a given uid.
  function getClaimConditionById(
    uint256 _conditionId
  ) external view returns (ClaimCondition memory) {
    return claimCondition.conditions[_conditionId];
  }

  /// @dev Returns the supply claimed by an account at a given uid.
  function getSupplyClaimedByWallet(
    uint256 _conditionId,
    address _claimer
  ) external view returns (uint256) {
    return claimCondition.supplyClaimedByWallet[_conditionId][_claimer];
  }

  // =============================================================
  //                           Hooks
  // =============================================================
  function _dropMsgSender() internal view virtual returns (address) {
    return msg.sender;
  }

  /// @dev Hook to be called before a claim is made
  function _beforeClaim(
    address _receiver,
    uint256 _quantity,
    address _currency,
    uint256 _pricePerToken,
    AllowlistProof calldata _allowlistProof,
    bytes memory _data
  ) internal virtual {}

  /// @dev Hook to be called after a claim is made
  function _afterClaim(
    address _receiver,
    uint256 _quantity,
    address _currency,
    uint256 _pricePerToken,
    AllowlistProof calldata _allowlistProof,
    bytes memory _data
  ) internal virtual {}

  /// @dev Collects and distributes the primary sale of a token being claimed
  function _collectPriceOnClaim(
    address _primarySaleRecipient,
    uint256 _quantityToClaim,
    address _currency,
    uint256 _pricePerToken
  ) internal virtual {}

  /// @dev Transfers the tokens being claimed.
  function _transferTokensOnClaim(
    address _to,
    uint256 _quantifyBeingClaimed
  ) internal virtual returns (uint256 startTokenId) {}

  /// @dev Determine what wallet can update the claim conditions
  function _canSetClaimConditions() internal view virtual returns (bool) {}
}
