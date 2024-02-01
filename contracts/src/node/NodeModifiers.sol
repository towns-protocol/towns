// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IERC721ABase} from "contracts/src/diamond/facets/token/ERC721A/IERC721A.sol";
import {INodeRegistryBase} from "./registry/INodeRegistry.sol";

// libraries
import {ERC721AStorage} from "contracts/src/diamond/facets/token/ERC721A/ERC721AStorage.sol";
import {NodeRegistryStorage} from "contracts/src/node/registry/NodeRegistryStorage.sol";

abstract contract NodeModifiers is INodeRegistryBase {
  uint256 internal constant _BITMASK_ADDRESS_DATA_ENTRY = (1 << 64) - 1;

  /**
   * @notice  Guards functions that can only be called by the operator of the given validator.
   * @dev     Reverts if `validator` is not operated by msg.sender.
   * @param   validator  Address of the validator.
   */
  modifier onlyOperator(address validator) {
    if (!_isOperatedBy(validator, msg.sender))
      revert NodeRegistry__OnlyOperator();
    _;
  }

  /**
   * @notice Returns the NFT balance of the given operator
   * @param operator Address for which the balance is returned
   * @return uint256 NFT balance of the given operator
   */
  function _balanceOf(address operator) internal view returns (uint256) {
    if (operator == address(0))
      revert IERC721ABase.BalanceQueryForZeroAddress();
    return
      ERC721AStorage.layout()._packedAddressData[operator] &
      _BITMASK_ADDRESS_DATA_ENTRY;
  }

  /**
   * @notice  Checks if a validator is operated by the given operator.
   * @param   validator  Address of the validator.
   * @param   _operator  Address of the operator.
   * @return  bool  True if the validator is operated by the given operator.
   */
  function _isOperatedBy(
    address validator,
    address _operator
  ) internal view returns (bool) {
    return NodeRegistryStorage.layout().nodes[validator].operator == _operator;
  }

  /**
   * @notice  Checks if a validator is in operation.
   * @dev     A validator is in operation if it has been registered.
   * @param   validator  Address of the validator.
   * @return  bool  True if the validator is in operation.
   */
  function _isInOperation(address validator) internal view returns (bool) {
    return NodeRegistryStorage.layout().nodes[validator].operator != address(0);
  }
}
