// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
interface IModularAccountBase {
    /// @notice Params for installing a module
    /// @param allowance The maximum amount of ETH that can be spent by the module
    /// @param grantDelay The delay before the module can be granted access to the group
    /// @param executionDelay The delay before the module can execute a transaction
    struct ModuleParams {
        uint256 allowance;
        uint32 grantDelay;
        uint32 executionDelay;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    error UnauthorizedModule(address module);
    error InvalidModuleAddress(address module);
    error InvalidManifest(address module);
    error UnauthorizedSelector();
    error NotEnoughEth();
    error ModuleAlreadyInstalled();
    error InvalidModuleId();
    error ModuleNotInstalled();
    error ModuleNotRegistered();
    error ModuleRevoked();
}

interface IModularAccount is IModularAccountBase {
    function installModule(
        bytes32 versionId,
        bytes calldata data,
        ModuleParams calldata params
    ) external;

    function uninstallModule(bytes32 versionId, bytes calldata data) external;

    function isModuleEntitled(
        bytes32 versionId,
        address publicKey,
        bytes32 permission
    ) external view returns (bool);

    function setModuleAllowance(bytes32 versionId, uint256 allowance) external;

    function getModuleAllowance(bytes32 versionId) external view returns (uint256);
}
