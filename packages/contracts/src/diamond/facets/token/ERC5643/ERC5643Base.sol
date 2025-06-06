// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC5643Base} from "./IERC5643.sol";

// libraries
import {ERC5643Storage} from "./ERC5643Storage.sol";

// contracts

abstract contract ERC5643Base is IERC5643Base {
    function _renewSubscription(uint256 tokenId, uint64 duration) internal {
        ERC5643Storage.Layout storage ds = ERC5643Storage.layout();
        uint64 currentExpiration = ds.expiration[tokenId];

        // Check renewability for existing subscriptions
        if (currentExpiration != 0 && !_isRenewable(tokenId)) {
            revert ERC5643__SubscriptionNotRenewable(tokenId);
        }

        // Calculate new expiration
        uint64 newExpiration;
        if (currentExpiration > block.timestamp) {
            // Active subscription: extend from current expiration
            newExpiration = currentExpiration + duration;
        } else {
            // New or expired subscription: start from current time
            newExpiration = uint64(block.timestamp) + duration;
        }

        ds.expiration[tokenId] = newExpiration;
        emit SubscriptionUpdate(tokenId, newExpiration);
    }

    function _cancelSubscription(uint256 tokenId) internal {
        delete ERC5643Storage.layout().expiration[tokenId];
        emit SubscriptionUpdate(tokenId, 0);
    }

    function _expiresAt(uint256 tokenId) internal view returns (uint64) {
        return ERC5643Storage.layout().expiration[tokenId];
    }

    function _isRenewable(uint256) internal view virtual returns (bool) {
        return true;
    }
}
