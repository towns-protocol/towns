// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

//interfaces
import {IAppFactoryBase} from "contracts/src/app/interfaces/IAppFactory.sol";

//libraries
import {Permissions} from "contracts/src/spaces/facets/Permissions.sol";
import {Inputs, Registry} from "contracts/src/app/types/AppTypes.sol";
import {AppErrors} from "contracts/src/app/libraries/AppErrors.sol";
import {Validator__InvalidLength, Validator__InvalidMaxLength, Validator__InvalidAddress} from "contracts/src/utils/Validator.sol";

//contracts
import {AppFactory} from "contracts/src/app/facets/AppFactory.sol";

import {DeployAppRegistry} from "contracts/scripts/deployments/diamonds/DeployAppRegistry.s.sol";

contract AppFactoryTest is TestUtils, IAppFactoryBase {
  DeployAppRegistry deployAppRegistry = new DeployAppRegistry();

  AppFactory public appFactory;

  uint256 internal nextAppId;

  // Default test values
  address internal constant DEFAULT_OWNER = address(0x1);
  address internal constant DEFAULT_APP = address(0x2);
  string internal constant DEFAULT_URI = "https://example.com/metadata";
  string internal constant DEFAULT_NAME = "TestApp";
  string internal constant DEFAULT_SYMBOL = "TAPP";

  function setUp() external {
    address deployer = getDeployer();
    address appRegistry = deployAppRegistry.deploy(deployer);
    appFactory = AppFactory(appRegistry);
    nextAppId = 1;
  }

  struct CreateTestAppParams {
    address owner;
    address app;
    string uri;
    string name;
    string symbol;
  }

  modifier givenAppIsCreated(CreateTestAppParams memory testParams) {
    Inputs.CreateApp memory params = buildCreateAppInput(testParams);
    createAppHelper(params);
    _;
  }

  function test_createApp_default()
    external
    givenAppIsCreated(defaultTestParams())
  {
    (Registry.Config memory config, string[] memory permissions) = appFactory
      .getAppByAddress(DEFAULT_APP);

    assertEq(config.app, DEFAULT_APP, "App address mismatch");
    assertEq(config.owner, DEFAULT_OWNER, "Owner address mismatch");
    assertEq(config.metadata.name, DEFAULT_NAME, "Name mismatch");
    assertEq(config.metadata.symbol, DEFAULT_SYMBOL, "Symbol mismatch");
    assertEq(
      uint256(config.status),
      uint256(Registry.Status.Pending),
      "Status mismatch"
    );
    assertEq(permissions.length, 2, "Permissions length mismatch");
    assertEq(permissions[0], Permissions.Read, "Read permission missing");
    assertEq(permissions[1], Permissions.Write, "Write permission missing");
  }

  function test_createApp_revertWith_InvalidAddress_App() external {
    Inputs.CreateApp memory params = defaultCreateAppInput();
    params.app = address(0); // Invalid app address

    vm.prank(params.owner);
    vm.expectRevert(Validator__InvalidAddress.selector);
    appFactory.createApp(params);
  }

  function test_createApp_revertWith_InvalidAddress_Owner() external {
    Inputs.CreateApp memory params = defaultCreateAppInput();
    params.owner = address(0); // Invalid owner address

    vm.expectRevert(Validator__InvalidAddress.selector);
    appFactory.createApp(params);
  }

  function test_createApp_revertWith_InvalidMaxLength_Name() external {
    Inputs.CreateApp memory params = defaultCreateAppInput();
    params
      .metadata
      .name = "ThisNameIsWayTooLongAndExceedsTheMaximumLengthOf32Characters";

    vm.prank(params.owner);
    vm.expectRevert(
      abi.encodeWithSelector(Validator__InvalidMaxLength.selector, 32)
    );
    appFactory.createApp(params);
  }

  function test_createApp_revertWith_InvalidMaxLength_Symbol() external {
    Inputs.CreateApp memory params = defaultCreateAppInput();
    params.metadata.symbol = "TOOLONG"; // More than 6 characters

    vm.prank(params.owner);
    vm.expectRevert(
      abi.encodeWithSelector(Validator__InvalidMaxLength.selector, 6)
    );
    appFactory.createApp(params);
  }

  function test_createApp_revertWith_CallerNotOwner() external {
    Inputs.CreateApp memory params = defaultCreateAppInput();
    address notOwner = makeAddr("notOwner");

    vm.prank(notOwner); // Caller is not the owner
    vm.expectRevert(AppErrors.CallerNotOwner.selector);
    appFactory.createApp(params);
  }

  function test_createApp_revertWith_InvalidAppAddress_SameAsOwner() external {
    address sameAddress = makeAddr("sameAddress");

    Inputs.CreateApp memory params = defaultCreateAppInput();
    params.owner = sameAddress;
    params.app = sameAddress; // App and owner are the same address

    vm.prank(sameAddress);
    vm.expectRevert(AppErrors.InvalidAppAddress.selector);
    appFactory.createApp(params);
  }

  function test_createApp_revertWith_InvalidAppAddress_SameAsFactory()
    external
  {
    address sameAddress = address(appFactory);

    Inputs.CreateApp memory params = defaultCreateAppInput();
    params.owner = sameAddress;
    params.app = address(appFactory); // App and owner are the same address

    vm.prank(sameAddress);
    vm.expectRevert(AppErrors.InvalidAppAddress.selector);
    appFactory.createApp(params);
  }

  function test_createApp_revertWith_InvalidStatus() external {
    Inputs.CreateApp memory params = defaultCreateAppInput();
    params.status = Registry.Status.Approved; // Status must be Pending

    vm.prank(params.owner);
    vm.expectRevert(AppErrors.InvalidStatus.selector);
    appFactory.createApp(params);
  }

  function test_createApp_revertWith_AlreadyRegistered() external {
    // First create an app
    Inputs.CreateApp memory params = defaultCreateAppInput();
    createAppHelper(params);

    // Try to register the same app again
    vm.prank(params.owner);
    vm.expectRevert(AppErrors.AlreadyRegistered.selector);
    appFactory.createApp(params);
  }

  function test_createApp_revertWith_AppTooManyPermissions() external {
    Inputs.CreateApp memory params = defaultCreateAppInput();

    // Create array with over MAX_PERMISSIONS (50)
    string[] memory permissions = new string[](51);
    for (uint i = 0; i < 51; i++) {
      permissions[i] = string(abi.encodePacked("permission", i));
    }
    params.permissions = permissions;

    vm.prank(params.owner);
    vm.expectRevert(Validator__InvalidLength.selector);
    appFactory.createApp(params);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           Helpers                            */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  /**
   * @notice Creates a default set of test parameters
   * @dev Provides standard values for app creation tests
   * @return params A CreateTestAppParams struct with default values
   */
  function defaultTestParams()
    internal
    pure
    returns (CreateTestAppParams memory params)
  {
    params.owner = DEFAULT_OWNER;
    params.app = DEFAULT_APP;
    params.uri = DEFAULT_URI;
    params.name = DEFAULT_NAME;
    params.symbol = DEFAULT_SYMBOL;
    return params;
  }

  /**
   * @notice Creates a default CreateApp input struct
   * @dev Builds a standard Inputs.CreateApp struct with default values and permissions
   * @param testParams Optional custom parameters (uses defaults if not provided)
   * @return params A fully initialized Inputs.CreateApp struct
   */
  function buildCreateAppInput(
    CreateTestAppParams memory testParams
  ) internal pure returns (Inputs.CreateApp memory params) {
    params.owner = testParams.owner;
    params.app = testParams.app;
    params.metadata.uri = testParams.uri;
    params.metadata.name = testParams.name;
    params.metadata.symbol = testParams.symbol;

    string[] memory permissions = new string[](2);
    permissions[0] = Permissions.Read;
    permissions[1] = Permissions.Write;
    params.permissions = permissions;

    return params;
  }

  /**
   * @notice Creates a default CreateApp input struct with standard values
   * @dev Convenience function that uses default test parameters
   * @return A fully initialized Inputs.CreateApp struct with default values
   */
  function defaultCreateAppInput()
    internal
    pure
    returns (Inputs.CreateApp memory)
  {
    return buildCreateAppInput(defaultTestParams());
  }

  /**
   * @notice Helper to create an app and return its ID
   * @dev Handles the app creation process and increments nextAppId
   * @param params The app creation parameters
   * @param caller The address that will call createApp (defaults to params.owner)
   * @return appId The ID of the created app
   */
  function createAppHelper(
    Inputs.CreateApp memory params,
    address caller
  ) internal returns (uint256 appId) {
    appId = nextAppId;
    nextAppId++;

    vm.prank(caller);
    vm.expectEmit(address(appFactory));
    emit AppCreated(
      appId,
      params.app,
      params.owner,
      params.metadata.name,
      params.metadata.symbol
    );
    appFactory.createApp(params);

    return appId;
  }

  /**
   * @notice Helper to create an app with the owner as caller
   * @dev Simplified version that uses the owner as the caller
   * @param params The app creation parameters
   * @return appId The ID of the created app
   */
  function createAppHelper(
    Inputs.CreateApp memory params
  ) internal returns (uint256 appId) {
    return createAppHelper(params, params.owner);
  }
}
