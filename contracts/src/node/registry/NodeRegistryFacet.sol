// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {INodeRegistry, Node} from "./INodeRegistry.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {NodeRegistryBase} from "./NodeRegistryBase.sol";

import {Facet} from "contracts/src/diamond/facets/Facet.sol";

/**
 * @author  HNT Labs
 * @title   Node Registry Facet for the Node Network Diamond.
 * @dev     This contract contains the external functions for managing the node registry.
 */

contract NodeRegistryFacet is INodeRegistry, NodeRegistryBase, Facet {
  /// @dev  Initializes the NodeRegistryFacet.
  function __NodeRegistry_init() external onlyInitializing {
    __NodeRegistry_init_unchained();
  }

  function __NodeRegistry_init_unchained() internal {
    _addInterface(type(INodeRegistry).interfaceId);
    __EIP712_init("NodeRegistry", "1");
  }

  /**
   * @notice  Registers a node.
   * @dev     An operator registers a node by submitting its validator's signature.
   * @notice  This one is for a v, r, s signature.
   * @param   registerNodePayload  A struct that encapsulates the node information.
   * @param   _v  v of the validator's signature.
   * @param   _r  r of the validator's signature.
   * @param   _s  s of the validator's signature.
   */
  function registerNode(
    RegisterNode calldata registerNodePayload,
    uint8 _v,
    bytes32 _r,
    bytes32 _s
  ) external {
    if (_balanceOf(msg.sender) == 0) revert NodeRegistry__OnlyOperator();

    bytes32 digest = _getRegisterNodeDigest(registerNodePayload);
    address signer = ECDSA.recover(digest, _v, _r, _s);

    if (signer != registerNodePayload.validator)
      revert NodeRegistry__InvalidValidatorSignature();

    if (msg.sender != registerNodePayload.operator)
      revert NodeRegistry__OnlyOperator();

    _registerNode(registerNodePayload);
  }

  /**
   * @notice  Returns the node information.
   * @param   validator  Address of the validator.
   * @return  Node  Node information.
   */
  function getNode(
    address validator
  ) external view override returns (Node memory) {
    return _getNode(validator);
  }

  /**
   * @notice  Updates a node.
   * @param   validator  Address of the validator.
   * @param   socket Socket of the node.
   */
  function updateNode(
    address validator,
    string memory socket
  ) external onlyOperator(validator) {
    _updateNode(validator, socket);
  }

  /**
   * @notice  Returns the digest for registering a node.
   * @param   registerNodePayload  A struct that encapsulates the node information.
   * @return  bytes32  The digest.
   */
  function getRegisterNodeDigest(
    RegisterNode calldata registerNodePayload
  ) external view override returns (bytes32) {
    return _getRegisterNodeDigest(registerNodePayload);
  }
}
