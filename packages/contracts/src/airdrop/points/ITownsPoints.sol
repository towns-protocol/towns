// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface ITownsPointsBase {
    enum Action {
        JoinSpace,
        CheckIn,
        Tip,
        Swap
    }

    /// @notice Emitted when a user successfully checks in and receives points
    /// @param user The address of the user who checked in
    /// @param points The number of points awarded for this check-in
    /// @param streak The user's current check-in streak after this check-in
    /// @param lastCheckIn The timestamp when this check-in occurred
    event CheckedIn(address indexed user, uint256 points, uint256 streak, uint256 lastCheckIn);

    /// @notice Error thrown when the space is invalid
    error TownsPoints__InvalidSpace();

    /// @notice Error thrown when the call data is invalid
    error TownsPoints__InvalidCallData();

    /// @notice Error thrown when the array length is invalid
    error TownsPoints__InvalidArrayLength();

    /// @notice Error thrown when a user attempts to check in too soon after their last check-in
    error TownsPoints__CheckInPeriodNotPassed();
}

interface ITownsPoints is ITownsPointsBase {
    /// @notice Batch mint points to multiple users
    /// @dev Only callable by the owner
    /// @param data The abi-encoded array of addresses and values to mint
    function batchMintPoints(bytes calldata data) external;

    /// @notice Mint points to a user
    /// @dev Only spaces can mint points
    /// @param to The address to mint the points to
    /// @param value The amount of points to mint
    function mint(address to, uint256 value) external;

    /// @notice Allows a user to check in and earn points based on their streak
    /// @dev Users must wait at least 24 hours between check-ins
    /// @dev If a user checks in within 48 hours of their last check-in, their streak continues
    /// @dev Otherwise, their streak resets to 1
    function checkIn() external;

    /// @notice Get the points from an eligible action
    /// @param action The action to get the points from
    /// @param data The data of the action
    function getPoints(Action action, bytes calldata data) external view returns (uint256);

    /// @notice Gets the current check-in streak for a user
    /// @param user The address of the user to query
    /// @return The current streak count for the user
    function getCurrentStreak(address user) external view returns (uint256);

    /// @notice Gets the timestamp of the user's last check-in
    /// @param user The address of the user to query
    /// @return The timestamp of the user's last check-in, 0 if never checked in
    function getLastCheckIn(address user) external view returns (uint256);
}
