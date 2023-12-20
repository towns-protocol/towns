// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.23;

// contracts
import {AccessControlEnumerable} from "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";

contract SimpleFaucet is AccessControlEnumerable, Pausable {
  bytes32 public constant BORROWER = keccak256("BORROWER");

  // max amount of tokens allowed to be borrowed per timelock
  uint256 public allowedAmount = 1 ether;

  /// timelock mapping
  mapping(address => uint256) public timelock;

  modifier onlyBorrower() {
    require(_isAllowed(_msgSender()), "SimpleFaucet: not allowed");
    _;
  }

  modifier onlyAdmin() {
    require(_isAdmin(_msgSender()), "SimpleFaucet: not admin");
    _;
  }

  receive() external payable {}

  fallback() external payable {}

  constructor() {
    _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _setupRole(BORROWER, _msgSender());
  }

  function isAllowed(address _account) external view returns (bool) {
    return _isAllowed(_account);
  }

  /// @notice request tokens from the faucet
  /// @param _borrower address of the account receiving the tokens
  function requestTokens(
    address payable _borrower
  ) external onlyBorrower whenNotPaused {
    // check that _borrower is a valid address
    require(_borrower != address(0), "SimpleFaucet: invalid address");

    // check if timelock has expired
    require(
      block.timestamp > timelock[_msgSender()],
      "SimpleFaucet: timelock not expired"
    );

    // check if contract has enough eth
    require(
      address(this).balance >= allowedAmount,
      "SimpleFaucet: not enough eth"
    );

    // update timelock
    _setTimelock(_msgSender(), block.timestamp + 1 days);

    // transfer tokens
    (bool sent, ) = _borrower.call{value: allowedAmount}("");
    require(sent, "SimpleFaucet: failed to send eth");
  }

  // =============================================================
  //                           ADMIN
  // =============================================================
  function pause() external onlyAdmin {
    _pause();
  }

  function unpause() external onlyAdmin {
    _unpause();
  }

  function setAmountAllowed(uint256 _amount) external onlyAdmin {
    allowedAmount = _amount;
  }

  function addBorrower(address _account) external onlyAdmin {
    require(_account != address(0), "SimpleFaucet: invalid address");
    _setupRole(BORROWER, _account);
  }

  function removeBorrower(address _account) external onlyAdmin {
    require(_account != address(0), "SimpleFaucet: invalid address");
    _revokeRole(BORROWER, _account);
  }

  function withdrawAll() external onlyAdmin {
    (bool sent, ) = _msgSender().call{value: address(this).balance}("");
    require(sent, "SimpleFaucet: failed to send eth");
  }

  // =============================================================
  //                           INTERNAL
  // =============================================================

  function _setTimelock(address _account, uint256 _timestamp) internal {
    timelock[_account] = _timestamp;
  }

  function _isAllowed(address _account) internal view returns (bool) {
    return hasRole(BORROWER, _account);
  }

  function _isAdmin(address _account) internal view returns (bool) {
    return hasRole(DEFAULT_ADMIN_ROLE, _account);
  }
}
