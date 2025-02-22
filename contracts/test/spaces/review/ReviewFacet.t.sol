// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {LibString} from "solady/utils/LibString.sol";
import {IReviewBase} from "contracts/src/spaces/facets/review/IReview.sol";
import {ReviewFacet} from "contracts/src/spaces/facets/review/ReviewFacet.sol";
import {ReviewStorage} from "contracts/src/spaces/facets/review/ReviewStorage.sol";
import {MembershipBaseSetup} from "contracts/test/spaces/membership/MembershipBaseSetup.sol";

contract ReviewFacetTest is MembershipBaseSetup, IReviewBase {
  using LibString for string;

  uint16 internal constant DEFAULT_MIN_COMMENT_LENGTH = 10;
  uint16 internal constant DEFAULT_MAX_COMMENT_LENGTH = type(uint16).max;

  ReviewFacet internal reviewFacet;

  ReviewStorage.Content internal sampleReview;

  function setUp() public override {
    super.setUp();

    reviewFacet = ReviewFacet(userSpace);

    // Example initialization of a sample review
    sampleReview = ReviewStorage.Content({
      comment: "Great experience!",
      rating: 5
    });
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                             ADD                            */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function test_fuzz_addReview_revertIf_notMember(address user) public {
    vm.assume(user != address(0));
    vm.assume(user != founder);
    vm.assume(membershipToken.balanceOf(user) == 0);

    vm.expectRevert(Entitlement__NotMember.selector);
    vm.prank(user);
    reviewFacet.setReview(Action.Add, abi.encode(sampleReview));
  }

  function test_addReview_revertIf_commentTooShort()
    public
    givenAliceHasMintedMembership
  {
    ReviewStorage.Content memory invalidReview = ReviewStorage.Content({
      comment: "Bad",
      rating: 5
    });

    vm.expectRevert(ReviewFacet__InvalidCommentLength.selector);
    vm.prank(alice);
    reviewFacet.setReview(Action.Add, abi.encode(invalidReview));
  }

  function test_addReview_revertIf_invalidRating()
    public
    givenAliceHasMintedMembership
  {
    ReviewStorage.Content memory invalidReview = ReviewStorage.Content({
      comment: "This exceeds the maximum allowed rating.",
      rating: 6 // Invalid rating
    });

    vm.expectRevert(ReviewFacet__InvalidRating.selector);
    vm.prank(alice);
    reviewFacet.setReview(Action.Add, abi.encode(invalidReview));
  }

  function test_fuzz_addReview(
    string memory comment,
    uint8 rating
  )
    public
    givenAliceHasMintedMembership
    returns (ReviewStorage.Content memory newReview)
  {
    rating = uint8(bound(rating, 0, 5));
    if (bytes(comment).length < DEFAULT_MIN_COMMENT_LENGTH) {
      comment = comment.concat(
        string(" ").repeat(DEFAULT_MIN_COMMENT_LENGTH - bytes(comment).length)
      );
    }
    if (bytes(comment).length > DEFAULT_MAX_COMMENT_LENGTH) {
      comment = comment.slice(0, DEFAULT_MAX_COMMENT_LENGTH);
    }

    newReview = ReviewStorage.Content({comment: comment, rating: rating});

    vm.prank(alice);
    reviewFacet.setReview(Action.Add, abi.encode(newReview));

    ReviewStorage.Content memory review = reviewFacet.getReview(alice);
    assertEq(review.comment, newReview.comment, "Comment mismatch");
    assertEq(review.rating, newReview.rating, "Rating mismatch");
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           UPDATE                           */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function test_updateReview() public givenAliceHasMintedMembership {
    vm.prank(alice);
    reviewFacet.setReview(Action.Add, abi.encode(sampleReview));

    ReviewStorage.Content memory updatedReview = ReviewStorage.Content({
      comment: "Updated comment",
      rating: 4
    });

    vm.prank(alice);
    reviewFacet.setReview(Action.Update, abi.encode(updatedReview));

    ReviewStorage.Content memory review = reviewFacet.getReview(alice);
    assertEq(review.comment, updatedReview.comment, "Updated comment mismatch");
    assertEq(review.rating, updatedReview.rating, "Updated rating mismatch");
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           DELETE                           */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function test_deleteReview() public givenAliceHasMintedMembership {
    vm.prank(alice);
    reviewFacet.setReview(Action.Add, abi.encode(sampleReview));

    vm.prank(alice);
    reviewFacet.setReview(Action.Delete, "");

    ReviewStorage.Content memory review = reviewFacet.getReview(alice);
    assertEq(review.comment, "", "Review not deleted correctly");
    assertEq(review.rating, 0, "Rating not reset correctly");
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           GETTERS                          */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function test_getReview() public givenAliceHasMintedMembership {
    vm.prank(alice);
    reviewFacet.setReview(Action.Add, abi.encode(sampleReview));

    ReviewStorage.Content memory review = reviewFacet.getReview(alice);
    assertEq(review.comment, sampleReview.comment, "Comment mismatch");
    assertEq(review.rating, sampleReview.rating, "Rating mismatch");
  }

  function test_getAllReviews() public givenAliceHasMintedMembership {
    vm.prank(alice);
    reviewFacet.setReview(Action.Add, abi.encode(sampleReview));

    vm.prank(charlie);
    membership.joinSpace(charlie);

    ReviewStorage.Content memory review = ReviewStorage.Content({
      comment: "Good Service.",
      rating: 4
    });

    vm.prank(charlie);
    reviewFacet.setReview(Action.Add, abi.encode(review));

    (
      address[] memory users,
      ReviewStorage.Content[] memory reviews
    ) = reviewFacet.getAllReviews();
    assertEq(users.length, 2, "User count incorrect");
    assertEq(reviews.length, 2, "Review count incorrect");
    assertEq(
      reviews[0].comment,
      sampleReview.comment,
      "First review comment mismatch"
    );
    assertEq(
      reviews[1].comment,
      review.comment,
      "Second review comment mismatch"
    );
  }
}
