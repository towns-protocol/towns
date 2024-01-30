// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {INodeRegistry, RegisterNode, Node} from "./INodeRegistry.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {NodeRegistryBase} from "./NodeRegistryBase.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";
import {Errors} from "./Errors.sol";

/**
 * @author  HNT Labs
 * @title   Node Registry Facet for the Node Network Diamond.
 * @dev     This contract contains the external functions for managing the node registry.
 */

contract NodeRegistryFacet is INodeRegistry, NodeRegistryBase, EIP712, Facet {
  bytes32 private constant _REGISTER_NODE_TYPEHASH =
    keccak256(
      "RegisterNode(address validator,address operator,bytes publicKey,bytes4 ipAddress,uint16 port)"
    );

  constructor() EIP712("RiverNetworkManager", "1") {}

  /**
   * @notice  Registers a node.
   * @dev     An operator registers a node by submitting its validator's signature.
   * @notice  This one is for a v, r, s signature.
   * @param   _registerNodePayload  A struct that encapsulates the node information.
   * @param   _v  v of the validator's signature.
   * @param   _r  r of the validator's signature.
   * @param   _s  s of the validator's signature.
   */
  function registerNode(
    RegisterNode calldata _registerNodePayload,
    uint8 _v,
    bytes32 _r,
    bytes32 _s
  ) external {
    bytes32 digest = getRegisterNodeDigest(_registerNodePayload);
    address signer = ECDSA.recover(digest, _v, _r, _s);

    if (signer != _registerNodePayload.validator)
      revert Errors.InvalidValidatorSignature();

    if (msg.sender != _registerNodePayload.operator)
      revert Errors.OnlyOperator();

    _registerNode(_registerNodePayload);
  }

  /**
   * @notice  Returns the node information.
   * @param   _validator  Address of the validator.
   * @return  Node  Node information.
   */
  function getNode(
    address _validator
  ) external view override returns (Node memory) {
    return _getNode(_validator);
  }

  /**
   * @notice  Updates a node.
   * @param   _validator  Address of the validator.
   * @param   _ipAddress  IP address of the node.
   * @param   _port  Port of the node.
   */
  function updateNode(
    address _validator,
    bytes4 _ipAddress,
    uint16 _port
  ) external onlyOperator(_validator) {
    _updateNode(_validator, _ipAddress, _port);
  }

  /**
   * @notice  Returns the EIP712 hash of the register node payload.
   * @param   _registerNodePayload  A struct that encapsulates the node information.
   * @return  bytes32  EIP712 hash of the register node payload.
   */
  function getRegisterNodeDigest(
    RegisterNode calldata _registerNodePayload
  ) public view returns (bytes32) {
    return
      _hashTypedDataV4(
        keccak256(
          abi.encode(
            _REGISTER_NODE_TYPEHASH,
            _registerNodePayload.validator,
            _registerNodePayload.operator,
            _registerNodePayload.publicKey,
            _registerNodePayload.ipAddress,
            _registerNodePayload.port
          )
        )
      );
  }
}
