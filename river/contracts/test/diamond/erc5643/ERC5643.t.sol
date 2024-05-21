// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC5643, IERC5643Base} from "contracts/src/diamond/facets/token/ERC5643/IERC5643.sol";
import {IERC721A} from "contracts/src/diamond/facets/token/ERC721A/IERC721A.sol";

// libraries

// contracts
import {ERC5643Setup} from "./ERC5643Setup.sol";

contract ERC5643Test is ERC5643Setup, IERC5643Base {
  function test_mintTo() external {
    address to = _randomAddress();

    uint256 tokenId = subscription.mintTo(to);

    assertEq(IERC721A(diamond).ownerOf(tokenId), to);
    assertEq(subscription.expiresAt(tokenId) - block.timestamp, 30 days);
  }

  function test_cancelSubscription() external {
    address to = _randomAddress();

    uint256 tokenId = subscription.mintTo(to);

    assertEq(subscription.expiresAt(tokenId) - block.timestamp, 30 days);

    vm.prank(to);
    subscription.cancelSubscription(tokenId);

    assertEq(subscription.expiresAt(tokenId), 0);
  }

  function test_renewSubscription() external {
    address to = _randomAddress();
    address operator = _randomAddress();

    uint256 tokenId = subscription.mintTo(to);
    uint256 expiresAt = subscription.expiresAt(tokenId);
    uint256 duration = 30 days;

    vm.prank(to);
    IERC721A(diamond).setApprovalForAll(operator, true);

    // go past the duration
    vm.warp(block.timestamp + 31 days);

    // allow the operator to renew the subscription
    // renew for 30 days
    vm.prank(operator);
    subscription.renewSubscription(tokenId, uint64(duration));

    // validate that the new expiration is the old expiration + duration
    assertEq(subscription.expiresAt(tokenId), expiresAt + duration);
  }

  function test_isRenewable() external {
    address to = _randomAddress();

    uint256 tokenId = subscription.mintTo(to);

    assertTrue(subscription.isRenewable(tokenId));

    tokenId = subscription.mintTo(to);

    assertFalse(subscription.isRenewable(tokenId));
  }
}
