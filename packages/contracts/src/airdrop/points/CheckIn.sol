// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interfaces

// libraries

// contracts

library CheckIn {
    struct CheckInData {
        uint256 streak;
        uint256 lastCheckIn;
    }

    struct Layout {
        mapping(address => CheckInData) checkInsByAddress;
    }

    // keccak256(abi.encode(uint256(keccak256("river.tokens.checkin.storage")) - 1)) &
    // ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x62755009e737dbac2f30b2876987ec999edfaa30486a87d0930a58dbf1ec6800;

    uint256 internal constant MAX_STREAK_PER_CHECKIN = 30; // Maximum streak per check-in
    uint256 internal constant MAX_POINTS_PER_CHECKIN = 30 ether; // Maximum points per check-in
    uint256 internal constant CHECK_IN_FORGIVENESS_PERIOD = 2 days; // Time window to continue
    // streak
    uint256 internal constant CHECK_IN_WAIT_PERIOD = 1 days; // Time between check-ins

    function getCurrentStreak(address user) internal view returns (uint256) {
        return layout().checkInsByAddress[user].streak;
    }

    function getLastCheckIn(address user) internal view returns (uint256) {
        return layout().checkInsByAddress[user].lastCheckIn;
    }

    function layout() internal pure returns (Layout storage l) {
        assembly {
            l.slot := STORAGE_SLOT
        }
    }

    function getPointsAndStreak(
        uint256 lastCheckIn,
        uint256 currentStreak,
        uint256 currentTime
    ) internal pure returns (uint256 pointsToAward, uint256 streak) {
        // First time checking in
        if (lastCheckIn == 0) {
            return (1 ether, 1); // equivalent to 1 point
        }

        // Must wait at least 24 hours between check-ins
        if (currentTime <= lastCheckIn + CHECK_IN_WAIT_PERIOD) {
            return (0, 0);
        }

        // Update streak based on timing
        bool isWithinForgiveness = currentTime <= lastCheckIn + CHECK_IN_FORGIVENESS_PERIOD;
        uint256 newStreak = isWithinForgiveness ? currentStreak + 1 : 1;

        // Calculate points based on new streak
        pointsToAward = newStreak > MAX_STREAK_PER_CHECKIN
            ? MAX_POINTS_PER_CHECKIN
            : newStreak * 1 ether;

        return (pointsToAward, newStreak);
    }
}
