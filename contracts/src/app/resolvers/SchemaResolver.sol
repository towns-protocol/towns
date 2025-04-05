// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISchemaResolver} from "../interfaces/ISchemaResolver.sol";

// libraries
import {DataTypes} from "../types/DataTypes.sol";

// contracts

abstract contract SchemaResolver is ISchemaResolver {
    address internal immutable appRegistry;

    constructor(address _appRegistry) {
        if (_appRegistry == address(0)) {
            revert DataTypes.InvalidAppRegistry();
        }
        appRegistry = _appRegistry;
    }

    modifier onlyAppRegistry() {
        if (msg.sender != appRegistry) {
            revert DataTypes.AccessDenied();
        }
        _;
    }

    receive() external payable virtual {
        if (!isPayable()) {
            revert DataTypes.NotPayable();
        }
    }

    /// @inheritdoc ISchemaResolver
    function isPayable() public pure virtual returns (bool) {
        return false;
    }

    /// @inheritdoc ISchemaResolver
    function attest(DataTypes.Attestation calldata attestation)
        external
        payable
        onlyAppRegistry
        returns (bool)
    {
        return onAttest(attestation, msg.value);
    }

    /// @inheritdoc ISchemaResolver
    function revoke(DataTypes.Attestation calldata attestation)
        external
        payable
        onlyAppRegistry
        returns (bool)
    {
        return onRevoke(attestation, msg.value);
    }

    /// @notice Hook that is called before an attestation is created
    /// @param attestation The attestation data
    /// @param value The amount of ETH sent with the attestation
    /// @return Whether the attestation is valid
    function onAttest(
        DataTypes.Attestation calldata attestation,
        uint256 value
    )
        internal
        virtual
        returns (bool);

    /// @notice Hook that is called before an attestation is revoked
    /// @param attestation The attestation data
    /// @param value The amount of ETH sent with the revocation
    /// @return Whether the attestation can be revoked
    function onRevoke(
        DataTypes.Attestation calldata attestation,
        uint256 value
    )
        internal
        virtual
        returns (bool);
}
