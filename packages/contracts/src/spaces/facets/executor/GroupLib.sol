// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {Group, Access} from "./IExecutor.sol";

// contracts
import {Time} from "@openzeppelin/contracts/utils/types/Time.sol";

library GroupLib {
    using Time for Time.Delay;
    using Time for uint32;

    /// @notice Sets the status of a group.
    /// @param status The status to set.
    function setStatus(Group storage self, bool status) internal {
        self.active = status;
    }

    /// @notice Sets the expiration of a group.
    /// @param expiration The expiration of the group.
    function setExpiration(Group storage self, uint48 expiration) internal {
        self.expiration = expiration;
    }

    /// @notice Sets the guardian for a group.
    /// @param guardian The guardian role ID.
    function setGuardian(Group storage self, bytes32 guardian) internal {
        self.guardian = guardian;
    }

    /// @notice Sets the grant delay for a group.
    /// @param grantDelay The new grant delay.
    /// @param minSetback The minimum setback for the delay.
    function setGrantDelay(Group storage self, uint32 grantDelay, uint32 minSetback) internal {
        (self.grantDelay, ) = self.grantDelay.withUpdate(grantDelay, minSetback);
    }

    /// @notice Grants access to a group for an account.
    /// @param account The account to grant access to.
    /// @param executionDelay The delay for execution.
    function grantAccess(
        Group storage self,
        address account,
        uint32 grantDelay,
        uint32 executionDelay
    ) internal returns (bool newMember, uint48 lastAccess) {
        newMember = self.members[account].lastAccess == 0;

        if (newMember) {
            lastAccess = Time.timestamp() + grantDelay;
            self.members[account] = Access({
                lastAccess: lastAccess,
                delay: executionDelay.toDelay()
            });
        } else {
            // just update the access delay
            (self.members[account].delay, lastAccess) = self.members[account].delay.withUpdate(
                executionDelay,
                0
            );
        }
    }

    /// @notice Revokes group access from an account.
    /// @param account The account to revoke access from.
    /// @return revoked True if access was revoked, false otherwise.
    function revokeAccess(Group storage self, address account) internal returns (bool revoked) {
        Access storage access = self.members[account];

        if (access.lastAccess == 0) {
            return false;
        }

        self.module = address(0);
        self.active = false;

        // delete the access
        delete self.members[account];
        return true;
    }

    function getAccess(
        Group storage self,
        address account
    )
        internal
        view
        returns (uint48 since, uint32 currentDelay, uint32 pendingDelay, uint48 effect)
    {
        Access storage access = self.members[account];
        since = access.lastAccess;
        (currentDelay, pendingDelay, effect) = access.delay.getFull();
        return (since, currentDelay, pendingDelay, effect);
    }

    /// @notice Checks if an account has access to a group.
    /// @param group The group to check.
    /// @param account The account to check.
    /// @return isMember True if the account is a member.
    /// @return executionDelay The execution delay for the account.
    function hasAccess(
        Group storage group,
        address account
    ) internal view returns (bool isMember, uint32 executionDelay) {
        Access storage access = group.members[account];
        uint48 since = access.lastAccess;
        (executionDelay, , ) = access.delay.getFull();

        // Check if member has valid access time
        isMember = since != 0 && since <= Time.timestamp();
    }

    /// @notice Gets the guardian for a group.
    /// @return The guardian role ID.
    function getGuardian(Group storage self) internal view returns (bytes32) {
        return self.guardian;
    }

    /// @notice Gets the grant delay for a group.
    /// @param group The group to check.
    /// @return The grant delay for the group.
    function getGrantDelay(Group storage group) internal view returns (uint32) {
        return group.grantDelay.get();
    }
}
