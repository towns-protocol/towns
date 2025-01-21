// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IArchitect} from "contracts/src/factory/facets/architect/IArchitect.sol";
import {ITownsPoints} from "./ITownsPoints.sol";

// libraries
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";
import {TownsPointsStorage} from "./TownsPointsStorage.sol";
import {CheckIn} from "./CheckIn.sol";

// contracts
import {Facet} from "@river-build/diamond/src/facets/Facet.sol";
import {OwnableBase} from "@river-build/diamond/src/facets/ownable/OwnableBase.sol";

contract TownsPoints is IERC20Metadata, ITownsPoints, OwnableBase, Facet {
  function __TownsPoints_init(address spaceFactory) external onlyInitializing {
    TownsPointsStorage.Layout storage ds = TownsPointsStorage.layout();
    ds.spaceFactory = spaceFactory;
    _addInterface(type(IERC20).interfaceId);
    _addInterface(type(IERC20Metadata).interfaceId);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           POINTS                           */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  modifier onlySpace() {
    address spaceFactory = TownsPointsStorage.layout().spaceFactory;
    if (IArchitect(spaceFactory).getTokenIdBySpace(msg.sender) == 0) {
      CustomRevert.revertWith(TownsPoints__InvalidSpace.selector);
    }
    _;
  }

  /// @inheritdoc ITownsPoints
  function batchMintPoints(bytes calldata data) external onlyOwner {
    address[] calldata accounts;
    uint256[] calldata values;
    uint256 relativeOffset;
    assembly {
      // call data layout:
      // address                  | value
      // data.offset              | 0x40 (accounts relative offset)
      // + 0x20                   | values relative offset
      // + 0x40                   | accounts.length
      // + 0x60 (accounts.offset) | accounts[0]
      let accountsLengthPtr := add(data.offset, calldataload(data.offset))
      accounts.length := calldataload(accountsLengthPtr)
      accounts.offset := add(accountsLengthPtr, 0x20)
      let valuesLengthPtr := add(
        data.offset,
        calldataload(add(data.offset, 0x20))
      )
      values.length := calldataload(valuesLengthPtr)
      values.offset := add(valuesLengthPtr, 0x20)
      relativeOffset := sub(values.offset, data.offset)
    }
    if (data.length < relativeOffset + (values.length << 5)) {
      CustomRevert.revertWith(TownsPoints__InvalidCallData.selector);
    }

    if (accounts.length != values.length) {
      CustomRevert.revertWith(TownsPoints__InvalidArrayLength.selector);
    }

    TownsPointsStorage.Layout storage self = TownsPointsStorage.layout();
    for (uint256 i; i < accounts.length; ++i) {
      self.inner.mint(accounts[i], values[i]);
    }
  }

  /// @inheritdoc ITownsPoints
  function getPoints(
    Action action,
    bytes calldata data
  ) external pure returns (uint256 points) {
    if (action == Action.JoinSpace) {
      uint256 protocolFee = abi.decode(data, (uint256));
      if (protocolFee <= 0.0003 ether) {
        points = protocolFee * 1_000_000;
      } else if (protocolFee <= 0.001 ether) {
        points = protocolFee * 2_000_000;
      } else {
        points = protocolFee * 3_000_000;
      }
    }

    if (action == Action.CheckIn) {
      (uint256 lastCheckIn, uint256 streak, uint256 currentTime) = abi.decode(
        data,
        (uint256, uint256, uint256)
      );
      (points, ) = CheckIn.getPointsAndStreak(lastCheckIn, streak, currentTime);
    }
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           CHECKIN                          */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  /// @inheritdoc ITownsPoints
  function checkIn() external {
    CheckIn.CheckInData storage userCheckIn = CheckIn
      .layout()
      .checkInsByAddress[msg.sender];

    (uint256 pointsToAward, uint256 newStreak) = CheckIn.getPointsAndStreak(
      userCheckIn.lastCheckIn,
      userCheckIn.streak,
      block.timestamp
    );

    // Must wait at least 24 hours between check-ins
    if (pointsToAward == 0 && newStreak == 0) {
      CustomRevert.revertWith(TownsPoints__CheckInPeriodNotPassed.selector);
    }

    (userCheckIn.streak, userCheckIn.lastCheckIn) = (
      newStreak,
      block.timestamp
    );
    TownsPointsStorage.layout().inner.mint(msg.sender, pointsToAward);
    emit CheckedIn(msg.sender, pointsToAward, newStreak, block.timestamp);
  }

  /// @inheritdoc ITownsPoints
  function getCurrentStreak(address user) external view returns (uint256) {
    return CheckIn.getCurrentStreak(user);
  }

  /// @inheritdoc ITownsPoints
  function getLastCheckIn(address user) external view returns (uint256) {
    return CheckIn.getLastCheckIn(user);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           ERC20                            */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  /// @inheritdoc IERC20
  function approve(address spender, uint256 value) external returns (bool) {
    TownsPointsStorage.layout().inner.approve(spender, value);
    return true;
  }

  /// @inheritdoc ITownsPoints
  function mint(address to, uint256 value) external onlySpace {
    TownsPointsStorage.layout().inner.mint(to, value);
  }

  /// @inheritdoc IERC20
  function transfer(address to, uint256 value) external returns (bool) {
    TownsPointsStorage.layout().inner.transfer(to, value);
    return true;
  }

  /// @inheritdoc IERC20
  function transferFrom(
    address from,
    address to,
    uint256 value
  ) external returns (bool) {
    TownsPointsStorage.layout().inner.transferFrom(from, to, value);
    return true;
  }

  /// @inheritdoc IERC20
  function allowance(
    address owner,
    address spender
  ) external view returns (uint256) {
    return TownsPointsStorage.layout().inner.allowance(owner, spender);
  }

  /// @inheritdoc IERC20
  function balanceOf(address account) external view returns (uint256) {
    return TownsPointsStorage.layout().inner.balanceOf(account);
  }

  /// @inheritdoc IERC20
  function totalSupply() external view returns (uint256) {
    return TownsPointsStorage.layout().inner.totalSupply;
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                       ERC20 METADATA                       */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  /// @inheritdoc IERC20Metadata
  function name() external pure returns (string memory) {
    return "Towns Points";
  }

  /// @inheritdoc IERC20Metadata
  function symbol() external pure returns (string memory) {
    return "TWP";
  }

  /// @inheritdoc IERC20Metadata
  function decimals() public pure virtual returns (uint8) {
    return 18;
  }
}
