// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IReview} from "./IReview.sol";

// libraries

import {ReviewStorage} from "./ReviewStorage.sol";
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {Entitled} from "src/spaces/facets/Entitled.sol";

contract ReviewFacet is IReview, Entitled, Facet {
    using EnumerableSetLib for EnumerableSetLib.AddressSet;

    uint256 internal constant DEFAULT_MIN_COMMENT_LENGTH = 10;
    uint256 internal constant DEFAULT_MAX_COMMENT_LENGTH = 4000;

    function __Review_init() external onlyInitializing {
        _addInterface(type(IReview).interfaceId);
    }

    function setReview(Action action, bytes calldata data) external {
        _validateMembership(msg.sender);

        ReviewStorage.Layout storage rs = ReviewStorage.layout();

        if (action == Action.Add) {
            Review memory newReview = abi.decode(data, (Review));
            _validateReview(newReview);

            ReviewStorage.Content storage review = rs.reviewByUser[msg.sender];

            if (review.createdAt != 0) {
                CustomRevert.revertWith(ReviewFacet__ReviewAlreadyExists.selector);
            }

            (review.comment, review.rating, review.createdAt) = (
                newReview.comment,
                newReview.rating,
                uint40(block.timestamp)
            );
            rs.usersReviewed.add(msg.sender);

            emit ReviewAdded(msg.sender, newReview.comment, newReview.rating);
        } else if (action == Action.Update) {
            Review memory newReview = abi.decode(data, (Review));
            _validateReview(newReview);

            ReviewStorage.Content storage review = rs.reviewByUser[msg.sender];

            if (review.createdAt == 0) {
                CustomRevert.revertWith(ReviewFacet__ReviewDoesNotExist.selector);
            }

            (review.comment, review.rating, review.updatedAt) = (
                newReview.comment,
                newReview.rating,
                uint40(block.timestamp)
            );

            emit ReviewUpdated(msg.sender, newReview.comment, newReview.rating);
        } else if (action == Action.Delete) {
            delete rs.reviewByUser[msg.sender];
            rs.usersReviewed.remove(msg.sender);

            emit ReviewDeleted(msg.sender);
        }
    }

    function getReview(address user) external view returns (ReviewStorage.Content memory review) {
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

    function _validateReview(Review memory review) internal pure {
        uint256 length = bytes(review.comment).length;
        if (length < DEFAULT_MIN_COMMENT_LENGTH || length > DEFAULT_MAX_COMMENT_LENGTH) {
            CustomRevert.revertWith(ReviewFacet__InvalidCommentLength.selector);
        }
        if (review.rating > 5) {
            CustomRevert.revertWith(ReviewFacet__InvalidRating.selector);
        }
    }
}
