// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

// libraries
import {ERC20MetadataBase} from "contracts/src/diamond/facets/token/ERC20/metadata/ERC20MetadataBase.sol";
import {ERC20PermitBase} from "contracts/src/diamond/facets/token/ERC20/permit/ERC20PermitBase.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

// contracts

abstract contract ERC20 is ERC20MetadataBase, ERC20PermitBase, Facet {
  function __ERC20_init(
    string memory name_,
    string memory symbol_,
    uint8 decimals_
  ) external onlyInitializing {
    __ERC20_init_unchained(name_, symbol_, decimals_);
  }

  function __ERC20_init_unchained(
    string memory name_,
    string memory symbol_,
    uint8 decimals_
  ) internal {
    _addInterface(type(IERC20).interfaceId);
    _addInterface(type(IERC20Permit).interfaceId);
    _addInterface(type(IERC20Metadata).interfaceId);
    __ERC20Metadata_init(name_, symbol_, decimals_);
    __EIP712_init_unchained(name_, "1");
  }

  /// @inheritdoc IERC20Metadata
  function name() public view returns (string memory) {
    return _name();
  }

  /// @inheritdoc IERC20Metadata
  function symbol() public view returns (string memory) {
    return _symbol();
  }

  /// @inheritdoc IERC20Metadata
  function decimals() public view returns (uint8) {
    return _decimals();
  }

  /// @inheritdoc IERC20
  function totalSupply() public view returns (uint256) {
    return _totalSupply();
  }

  /// @inheritdoc IERC20
  function balanceOf(address account) public view returns (uint256) {
    return _balanceOf(account);
  }

  /// @inheritdoc IERC20
  function allowance(
    address owner,
    address spender
  ) public view virtual returns (uint256 result) {
    return _allowance(owner, spender);
  }

  /// @inheritdoc IERC20
  function approve(
    address spender,
    uint256 amount
  ) public virtual returns (bool) {
    return _approve(spender, amount);
  }

  /// @inheritdoc IERC20
  function transfer(address to, uint256 amount) public virtual returns (bool) {
    return _transfer(to, amount);
  }

  /// @inheritdoc IERC20
  function transferFrom(
    address from,
    address to,
    uint256 amount
  ) public virtual returns (bool) {
    return _transferFrom(from, to, amount);
  }

  // =============================================================
  //                           PERMIT
  // =============================================================

  /// @inheritdoc IERC20Permit
  function nonces(address owner) external view returns (uint256 result) {
    return _latestNonce(owner);
  }

  /// @inheritdoc IERC20Permit
  function permit(
    address owner,
    address spender,
    uint256 amount,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external {
    _permit(owner, spender, amount, deadline, v, r, s);
  }

  /// @inheritdoc IERC20Permit
  function DOMAIN_SEPARATOR() external view returns (bytes32 result) {
    return _domainSeparatorV4();
  }
}
