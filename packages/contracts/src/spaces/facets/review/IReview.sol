// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import {ReviewStorage} from "./ReviewStorage.sol";

interface IReviewBase {
    enum Action {
        Add,
        Update,
        Delete
    }

    struct Review {
        string comment;
        uint8 rating;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Emitted when a review is added
    event ReviewAdded(address indexed user, string comment, uint8 rating);

    /// @notice Emitted when a review is updated
    event ReviewUpdated(address indexed user, string comment, uint8 rating);

    /// @notice Emitted when a review is deleted
    event ReviewDeleted(address indexed user);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       CUSTOM ERRORS                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    error ReviewFacet__InvalidCommentLength();
    error ReviewFacet__InvalidRating();
    error ReviewFacet__ReviewAlreadyExists();
    error ReviewFacet__ReviewDoesNotExist();
}

interface IReview is IReviewBase {
    function setReview(Action action, bytes calldata data) external;

    function getReview(address user) external view returns (ReviewStorage.Content memory);

    function getAllReviews()
        external
        view
        returns (address[] memory users, ReviewStorage.Content[] memory reviews);
}
