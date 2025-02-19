// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IReview} from "./IReview.sol";

// libraries
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";
import {ReviewStorage} from "./ReviewStorage.sol";

// contracts
import {Facet} from "@river-build/diamond/src/facets/Facet.sol";
import {Entitled} from "contracts/src/spaces/facets/Entitled.sol";

contract ReviewFacet is IReview, Entitled, Facet {
  using EnumerableSetLib for EnumerableSetLib.AddressSet;

  uint16 internal constant DEFAULT_MIN_COMMENT_LENGTH = 10;
  uint16 internal constant DEFAULT_MAX_COMMENT_LENGTH = type(uint16).max;

  function __Review_init(
    uint16 minCommentLength,
    uint16 maxCommentLength
  ) external onlyInitializing {
    ReviewStorage.Layout storage rs = ReviewStorage.layout();
    (rs.minCommentLength, rs.maxCommentLength) = (
      minCommentLength,
      maxCommentLength
    );

    _addInterface(type(IReview).interfaceId);
  }

  function setReview(Action action, bytes calldata data) external {
    _validateMembership(msg.sender);

    ReviewStorage.Layout storage rs = ReviewStorage.layout();

    if (action == Action.Add) {
      ReviewStorage.Content memory newReview = abi.decode(
        data,
        (ReviewStorage.Content)
      );
      _validateReview(newReview);
      rs.reviewByUser[msg.sender] = newReview;
      rs.usersReviewed.add(msg.sender);

      emit ReviewAdded(msg.sender, newReview);
    } else if (action == Action.Update) {
      ReviewStorage.Content memory newReview = abi.decode(
        data,
        (ReviewStorage.Content)
      );
      _validateReview(newReview);
      rs.reviewByUser[msg.sender] = newReview;

      emit ReviewUpdated(msg.sender, newReview);
    } else if (action == Action.Delete) {
      delete rs.reviewByUser[msg.sender];
      rs.usersReviewed.remove(msg.sender);

      emit ReviewDeleted(msg.sender);
    }
  }

  function getReview(
    address user
  ) external view returns (ReviewStorage.Content memory review) {
    assembly ("memory-safe") {
      mstore(0x40, review)
    }
    review = ReviewStorage.layout().reviewByUser[user];
  }

  function getAllReviews()
    external
    view
    returns (address[] memory users, ReviewStorage.Content[] memory reviews)
  {
    ReviewStorage.Layout storage rs = ReviewStorage.layout();
    users = rs.usersReviewed.values();
    reviews = new ReviewStorage.Content[](users.length);
    for (uint256 i; i < users.length; ++i) {
      reviews[i] = rs.reviewByUser[users[i]];
    }
  }

  function _validateReview(ReviewStorage.Content memory review) internal view {
    ReviewStorage.Layout storage rs = ReviewStorage.layout();

    uint256 length = bytes(review.comment).length;
    (uint16 minCommentLength, uint16 maxCommentLength) = (
      rs.minCommentLength,
      rs.maxCommentLength
    );
    unchecked {
      // type(uint16).max if unset
      maxCommentLength = maxCommentLength - 1;
    }
    if (
      length <
      FixedPointMathLib.max(DEFAULT_MIN_COMMENT_LENGTH, minCommentLength) ||
      length > maxCommentLength
    ) {
      CustomRevert.revertWith(ReviewFacet__InvalidCommentLength.selector);
    }
    if (review.rating > 5) {
      CustomRevert.revertWith(ReviewFacet__InvalidRating.selector);
    }
  }
}
