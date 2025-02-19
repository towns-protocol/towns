// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import {ReviewStorage} from "./ReviewStorage.sol";

interface IReviewBase {
  enum Action {
    Add,
    Update,
    Delete
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                       CUSTOM ERRORS                        */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  error ReviewFacet__InvalidCommentLength();
  error ReviewFacet__InvalidRating();

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           EVENTS                           */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  event ReviewAdded(address indexed user, ReviewStorage.Content review);

  event ReviewUpdated(address indexed user, ReviewStorage.Content review);

  event ReviewDeleted(address indexed user);
}

interface IReview is IReviewBase {
  function setReview(Action action, bytes calldata data) external;

  function getReview(
    address user
  ) external view returns (ReviewStorage.Content memory);

  function getAllReviews()
    external
    view
    returns (address[] memory users, ReviewStorage.Content[] memory reviews);
}
