// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {DataTypes} from "contracts/src/factory/facets/eas/DataTypes.sol";
import {AttestationLib} from "contracts/src/factory/facets/eas/libraries/AttestationLib.sol";

contract AppRegistry {
    function registerApp(
        bytes32 schemaId,
        address app,
        bytes memory encodedData
    )
        external
        payable
        returns (bytes32 appId)
    {
        DataTypes.AttestationRequestData memory data = DataTypes.AttestationRequestData({
            recipient: address(app), // The plugin contract will receive the attestation
            expirationTime: 0, // No expiration
            revocable: true, // Can be revoked
            refUID: DataTypes.EMPTY_UID, // No reference attestation
            data: encodedData, // The encoded schema data
            value: 0 // No ETH value sent
        });

        // Create the full attestation request
        DataTypes.AttestationRequest memory request =
            DataTypes.AttestationRequest({schemaId: schemaId, data: data});

        DataTypes.Attestation memory attestation =
            AttestationLib.attest(request.schemaId, request.data, msg.sender, 0, true);

        return attestation.uid;
    }
}
