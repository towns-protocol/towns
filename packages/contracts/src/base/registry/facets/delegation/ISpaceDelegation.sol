// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface ISpaceDelegationBase {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    event SpaceDelegatedToOperator(address indexed space, address indexed operator);
    event RiverTokenChanged(address indexed riverToken);
    event SpaceFactoryChanged(address indexed spaceFactory);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    error SpaceDelegation__InvalidAddress();
    error SpaceDelegation__InvalidOperator();
    error SpaceDelegation__InvalidSpace();
    error SpaceDelegation__NotSpaceOwner();
    error SpaceDelegation__NotSpaceMember();
    error SpaceDelegation__AlreadyDelegated(address operator);
    error SpaceDelegation__NotDelegated();
    error SpaceDelegation__InvalidStakeRequirement();
}

interface ISpaceDelegation is ISpaceDelegationBase {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         DELEGATION                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Adds a space delegation to an operator
    /// @param space The address of the space
    /// @param operator The address of the operator
    function addSpaceDelegation(address space, address operator) external;

    /// @notice Removes a space delegation from an operator
    /// @param space The address of the space
    function removeSpaceDelegation(address space) external;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           FACTORY                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Sets the address of the space factory
    /// @param spaceFactory The address of the space factory
    function setSpaceFactory(address spaceFactory) external;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           VIEWS                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Gets the operator address for a given space
    /// @param space The address of the space
    /// @return The address of the operator delegated to the space
    function getSpaceDelegation(address space) external view returns (address);

    /// @notice Gets all spaces delegated to a specific operator
    /// @param operator The address of the operator
    /// @return An array of space addresses delegated to the operator
    function getSpaceDelegationsByOperator(
        address operator
    ) external view returns (address[] memory);

    /// @notice Gets the total delegation for a specific operator
    /// @param operator The address of the operator
    /// @return The total amount delegated to the operator
    function getTotalDelegation(address operator) external view returns (uint256);

    /// @notice Gets the address of the space factory
    /// @return The address of the space factory
    function getSpaceFactory() external view returns (address);
}
