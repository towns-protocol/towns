// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {Group, Access, IExecutorBase} from "../IExecutor.sol";

// contracts
import {Time} from "@openzeppelin/contracts/utils/types/Time.sol";

library GroupLib {
    using Time for Time.Delay;
    using Time for uint32;

    /// @notice Creates a new group and marks it as active.
    function createGroup(Group storage self) internal {
        self.active = true;
    }

    /// @notice Removes (deactivates) a group.
    function removeGroup(Group storage self) internal {
        self.active = false;
    }

    /// @notice Sets the guardian for a group.
    /// @param guardian The guardian role ID.
    function setGuardian(Group storage self, bytes32 guardian) internal {
        self.guardian = guardian;
    }

    /// @notice Sets the ETH allowance for a group.
    /// @param allowance The new ETH allowance.
    function setAllowance(Group storage self, uint256 allowance) internal {
        self.allowance = allowance;
    }

    /// @notice Sets the grant delay for a group.
    /// @param grantDelay The new grant delay.
    /// @param minSetback The minimum setback for the delay.
    function setGrantDelay(Group storage self, uint32 grantDelay, uint32 minSetback) internal {
        uint48 effect;
        (self.grantDelay, effect) = self.grantDelay.withUpdate(grantDelay, minSetback);
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

    function isActive(Group storage self) internal view returns (bool) {
        return self.active;
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

    /// @notice Checks if a group has access to a module.
    /// @param module The module to check access for.
    /// @return isMember True if the account is a member, false otherwise.
    /// @return executionDelay The execution delay for the account.
    /// @return allowance The allowance for the account.
    /// @return active True if the group is active, false otherwise.
    function hasAccess(
        Group storage self,
        address module
    ) internal view returns (bool isMember, uint32 executionDelay, uint256 allowance, bool active) {
        (uint48 hasRoleSince, uint32 currentDelay, , ) = getAccess(self, module);
        return (
            hasRoleSince != 0 && hasRoleSince <= Time.timestamp(),
            currentDelay,
            self.allowance,
            self.active
        );
    }

    /// @notice Gets the guardian for a group.
    /// @return The guardian role ID.
    function getGuardian(Group storage self) internal view returns (bytes32) {
        return self.guardian;
    }

    /// @notice Gets the grant delay for a group.
    /// @return The grant delay in seconds.
    function getGrantDelay(Group storage self) internal view returns (uint32) {
        return self.grantDelay.get();
    }

    /// @notice Gets the ETH allowance for a group.
    /// @return The ETH allowance.
    function getAllowance(Group storage self) internal view returns (uint256) {
        return self.allowance;
    }
}
