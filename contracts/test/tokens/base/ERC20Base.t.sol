// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

//interfaces

//libraries

//contracts
import {TestUtils} from "contracts/test/utils/TestUtils.sol";
import {ERC20Base} from "contracts/src/tokens/base/ERC20Base.sol";

contract ERC20BaseTest is TestUtils {
  string internal constant NAME = "Test";
  string internal constant SYMBOL = "TST";

  ERC20Base internal erc20Base;
  address internal deployer;

  uint256 internal recipientPrivateKey;
  address internal receiver;

  bytes32 internal permitTypeHash;
  bytes32 internal permitNameHash;
  bytes32 internal permitVersionHash;
  bytes32 internal typehashEip712;
  bytes32 internal domainSeparator;

  function setUp() external {
    deployer = _randomAddress();

    recipientPrivateKey = _randomUint256();
    receiver = vm.addr(recipientPrivateKey);

    typehashEip712 = keccak256(
      "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    permitTypeHash = keccak256(
      "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
    );
    permitNameHash = keccak256(bytes(NAME));
    permitVersionHash = keccak256("1");

    vm.prank(deployer);
    erc20Base = new ERC20Base(NAME, SYMBOL);
  }

  /// =======
  /// Minting
  /// =======

  function test_mintTo() public {
    uint256 amount = 5 ether;

    uint256 totalSupply = erc20Base.totalSupply();
    uint256 receiverBalance = erc20Base.balanceOf(receiver);

    vm.prank(deployer);
    erc20Base.mintTo(receiver, amount);

    assertEq(erc20Base.totalSupply(), totalSupply + amount);
    assertEq(erc20Base.balanceOf(receiver), receiverBalance + amount);
  }

  function test_revertMinToNotAuthorized() public {
    uint256 amount = 5 ether;

    vm.expectRevert("ERC20Base: cannot mint");
    vm.prank(_randomAddress());
    erc20Base.mintTo(receiver, amount);
  }

  function test_revertIfMintingZeroTokens() public {
    uint256 amount = 0;

    vm.expectRevert("ERC20Base: cannot mint 0");
    vm.prank(deployer);
    erc20Base.mintTo(receiver, amount);
  }

  function test_revertIfMintingToZeroAddress() public {
    uint256 amount = 5 ether;

    vm.expectRevert("ERC20: mint to the zero address");
    vm.prank(deployer);
    erc20Base.mintTo(address(0), amount);
  }

  /// =======
  /// Burning
  /// =======

  function test_Burn() public {
    uint256 amount = 5 ether;

    vm.prank(deployer);
    erc20Base.mintTo(receiver, amount);

    uint256 totalSupply = erc20Base.totalSupply();
    uint256 receiverBalance = erc20Base.balanceOf(receiver);

    vm.prank(receiver);
    erc20Base.burn(amount);

    assertEq(erc20Base.totalSupply(), totalSupply - amount);
    assertEq(erc20Base.balanceOf(receiver), receiverBalance - amount);
  }

  function test_BurnNotEnoughBalance() public {
    uint256 amount = 5 ether;

    vm.expectRevert("ERC20Base: not enough balance");
    vm.prank(receiver);
    erc20Base.burn(amount);
  }

  /// ======
  /// Permit
  /// ======
  function testPermit() public {
    uint256 amount = 5 ether;

    // mint amount to recipient
    vm.prank(deployer);
    erc20Base.mintTo(receiver, amount);

    // generate permit signature
    address _owner = receiver;
    address _spender = _randomAddress();
    uint256 _value = 1 ether;
    uint256 _deadline = block.timestamp + 1000;
    uint256 _nonce = erc20Base.nonces(_owner);

    domainSeparator = keccak256(
      abi.encode(
        typehashEip712,
        permitNameHash,
        permitVersionHash,
        block.chainid,
        address(erc20Base)
      )
    );

    bytes32 structHash = keccak256(
      abi.encode(permitTypeHash, _owner, _spender, _value, _nonce, _deadline)
    );

    bytes32 typedDataHash = keccak256(
      abi.encodePacked("\x19\x01", domainSeparator, structHash)
    );

    (uint8 v, bytes32 r, bytes32 s) = vm.sign(
      recipientPrivateKey,
      typedDataHash
    );

    // call permit to approve _value to _spender
    erc20Base.permit(_owner, _spender, _value, _deadline, v, r, s);

    // check allowance
    uint256 _allowance = erc20Base.allowance(_owner, _spender);

    assertEq(_allowance, _value);
    assertEq(erc20Base.nonces(_owner), _nonce + 1);
  }

  function test_revertPermitIncorrectKey() public {
    uint256 amount = 5 ether;
    uint256 wrongPrivateKey = _randomUint256();

    // mint amount to recipient
    vm.prank(deployer);
    erc20Base.mintTo(receiver, amount);

    // generate permit signature
    address _owner = receiver;
    address _spender = _randomAddress();
    uint256 _value = 1 ether;
    uint256 _deadline = block.timestamp + 1000;
    uint256 _nonce = erc20Base.nonces(_owner);

    domainSeparator = keccak256(
      abi.encode(
        typehashEip712,
        permitNameHash,
        permitVersionHash,
        block.chainid,
        address(erc20Base)
      )
    );

    bytes32 structHash = keccak256(
      abi.encode(permitTypeHash, _owner, _spender, _value, _nonce, _deadline)
    );

    bytes32 typedDataHash = keccak256(
      abi.encodePacked("\x19\x01", domainSeparator, structHash)
    );

    (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongPrivateKey, typedDataHash);

    vm.expectRevert("ERC20Permit: invalid signature");
    erc20Base.permit(_owner, _spender, _value, _deadline, v, r, s);
  }

  function test_revertPermitUsedNonce() public {
    uint256 amount = 5 ether;

    // mint amount to recipient
    vm.prank(deployer);
    erc20Base.mintTo(receiver, amount);

    // generate permit signature
    address _owner = receiver;
    address _spender = _randomAddress();
    uint256 _value = 1 ether;
    uint256 _deadline = block.timestamp + 1000;
    uint256 _nonce = erc20Base.nonces(_owner);

    domainSeparator = keccak256(
      abi.encode(
        typehashEip712,
        permitNameHash,
        permitVersionHash,
        block.chainid,
        address(erc20Base)
      )
    );

    bytes32 structHash = keccak256(
      abi.encode(permitTypeHash, _owner, _spender, _value, _nonce, _deadline)
    );

    bytes32 typedDataHash = keccak256(
      abi.encodePacked("\x19\x01", domainSeparator, structHash)
    );

    (uint8 v, bytes32 r, bytes32 s) = vm.sign(
      recipientPrivateKey,
      typedDataHash
    );

    // call permit to approve _value to _spender
    erc20Base.permit(_owner, _spender, _value, _deadline, v, r, s);

    // sign again with same nonce
    (v, r, s) = vm.sign(recipientPrivateKey, typedDataHash);

    vm.expectRevert("ERC20Permit: invalid signature");
    erc20Base.permit(_owner, _spender, _value, _deadline, v, r, s);
  }

  function test_revertPermitExpiredDeadline() public {
    uint256 amount = 5 ether;

    vm.prank(deployer);
    erc20Base.mintTo(receiver, amount);

    // generate permit signature
    address _owner = receiver;
    address _spender = _randomAddress();
    uint256 _value = 1 ether;
    uint256 _deadline = block.timestamp - 1;
    uint256 _nonce = erc20Base.nonces(_owner);

    domainSeparator = keccak256(
      abi.encode(
        typehashEip712,
        permitNameHash,
        permitVersionHash,
        block.chainid,
        address(erc20Base)
      )
    );

    bytes32 structHash = keccak256(
      abi.encode(permitTypeHash, _owner, _spender, _value, _nonce, _deadline)
    );

    bytes32 typedDataHash = keccak256(
      abi.encodePacked("\x19\x01", domainSeparator, structHash)
    );

    (uint8 v, bytes32 r, bytes32 s) = vm.sign(
      recipientPrivateKey,
      typedDataHash
    );

    // call permit to approve _value to _spender
    vm.warp(_deadline + 1);
    vm.expectRevert("ERC20Permit: expired deadline");
    erc20Base.permit(_owner, _spender, _value, _deadline, v, r, s);
  }
}
