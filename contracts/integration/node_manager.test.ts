/* eslint-disable camelcase */
import { expect } from "chai";
import { BigNumber, utils } from "ethers";
import { upgrades, ethers } from "hardhat";

import {
  NodeManager,
  NodeManager__factory,
  NodeManagerUpgradeTest,
  NodeManagerUpgradeTest__factory,
  FQDNRegex__factory,
  FQDNRegex,
  // eslint-disable-next-line node/no-missing-import
} from "../../typechain-types/index";

// Unsure why these values were showing up as unused
export const enum NodeState {
  // eslint-disable-next-line no-unused-vars
  UNINITIALIZED = 0,
  // eslint-disable-next-line no-unused-vars
  PENDING,
  // eslint-disable-next-line no-unused-vars
  SERVING,
  // eslint-disable-next-line no-unused-vars
  EXITING,
}

/*
export const enum PeerExitState {
  UNINITIALIZED,
  PENDING,
  COMPLETE,
  ABANDONED,
}
*/
/*
 This was an aborted attempt to compute the interface from the ABI, but it didn't match so
 the interfaceId's are hard coded below

import IAccessControlUpgradeable from "@openzeppelin/contracts-upgradeable/build/contracts/AccessControlUpgradeable.json";

const IAccessControlUpgradeableInterface = new ethers.utils.Interface(
  IAccessControlUpgradeable.abi
);

export function getInterfaceID(contractInterface: ethers.utils.Interface) {
  let interfaceID: ethers.BigNumber = ethers.constants.Zero;
  const functions: string[] = Object.keys(contractInterface.functions);
  for (let i = 0; i < functions.length; i++) {
    interfaceID = interfaceID.xor(contractInterface.getSighash(functions[i]));
  }

  return interfaceID;
}
*/

// eslint-disable-next-line camelcase
// type NodeManagerContract = Awaited<ReturnType<NodeManager__factory["deploy"]>>;
/*
type ContractState = Awaited<
  ReturnType<NodeManagerContract["getCurrentState"]>
>;
*/

const IERC1822ProxiableUpgradeable = "0x52d1902d";
const IAccessControlUpgradeable = "0x7965db0b";

describe("Tests", function () {
  describe("FQDNRegex Tests", function () {
    // Testing "([a-zA-Z0-9-]+\\.)+[a-zA-Z][a-zA-Z]+";
    let fqdnRegex: FQDNRegex;
    before(async function () {
      const FQDNRegexFactory = (await ethers.getContractFactory(
        "FQDNRegex"
      )) as FQDNRegex__factory;
      fqdnRegex = (await FQDNRegexFactory.deploy()) as FQDNRegex;
      await fqdnRegex.deployed();
    });
    it("FQDNRegex matches", async function () {
      expect(await fqdnRegex.matches("911.gov")).to.equal(true);
      expect(await fqdnRegex.matches("a.com")).to.equal(true);
      expect(await fqdnRegex.matches("A.com")).to.equal(true);
      expect(await fqdnRegex.matches("1.com")).to.equal(true);
      expect(await fqdnRegex.matches("-.com")).to.equal(true);
      expect(await fqdnRegex.matches("a-.com")).to.equal(true);
      expect(await fqdnRegex.matches("-a.com")).to.equal(true);
      expect(await fqdnRegex.matches("a.com")).to.equal(true);
      expect(await fqdnRegex.matches("a.b.com")).to.equal(true);
      expect(await fqdnRegex.matches("A.COM")).to.equal(true);
      expect(await fqdnRegex.matches("9a.gov")).to.equal(true);
      expect(await fqdnRegex.matches("aa-.com")).to.equal(true);
      expect(await fqdnRegex.matches("-aa.com")).to.equal(true);
      expect(await fqdnRegex.matches("aaa.com")).to.equal(true);
      expect(await fqdnRegex.matches("aaa.bbb.com")).to.equal(true);
      expect(await fqdnRegex.matches("A.B.COM")).to.equal(true);
      expect(
        await fqdnRegex.matches("typical-hostname33.whatever.co.uk")
      ).to.equal(true);

      expect(await fqdnRegex.matches("a")).to.equal(false);
      expect(await fqdnRegex.matches("aa")).to.equal(false);
      expect(await fqdnRegex.matches("911")).to.equal(false);
      expect(await fqdnRegex.matches("a.911")).to.equal(false);
      expect(await fqdnRegex.matches("my_host.com")).to.equal(false);
      expect(await fqdnRegex.matches("a.a8a")).to.equal(false);
      expect(await fqdnRegex.matches("a.a")).to.equal(false);
      expect(await fqdnRegex.matches("a.7")).to.equal(false);
      expect(await fqdnRegex.matches("a.7a")).to.equal(false);
      expect(await fqdnRegex.matches("a.a7")).to.equal(false);
      expect(await fqdnRegex.matches(".")).to.equal(false);
      expect(await fqdnRegex.matches(".com")).to.equal(false);
      expect(await fqdnRegex.matches(".a.com")).to.equal(false);
      expect(await fqdnRegex.matches("a.com.")).to.equal(false);
      expect(await fqdnRegex.matches("a..com")).to.equal(false);
      expect(await fqdnRegex.matches("A.C")).to.equal(false);
      expect(await fqdnRegex.matches("&.COM")).to.equal(false);
      expect(await fqdnRegex.matches("ab.&")).to.equal(false);
      expect(await fqdnRegex.matches("[].com")).to.equal(false);
      expect(await fqdnRegex.matches("abc[].com")).to.equal(false);
      expect(await fqdnRegex.matches("[]abc.com")).to.equal(false);
      expect(await fqdnRegex.matches("abc.com[]")).to.equal(false);
      expect(await fqdnRegex.matches("abc.[]com")).to.equal(false);
      expect(await fqdnRegex.matches("{}.com")).to.equal(false);
      expect(await fqdnRegex.matches("abc{}.com")).to.equal(false);
      expect(await fqdnRegex.matches("{}abc.com")).to.equal(false);
      expect(await fqdnRegex.matches("abc.com{}")).to.equal(false);
      expect(await fqdnRegex.matches("abc.{}com")).to.equal(false);
    });
  });

  let fqdnRegex: FQDNRegex;
  before(async function () {
    const FQDNRegexFactory = (await ethers.getContractFactory(
      "FQDNRegex"
    )) as FQDNRegex__factory;
    fqdnRegex = (await FQDNRegexFactory.deploy()) as FQDNRegex;
    await fqdnRegex.deployed();
  });

  it("NodeManager Should deploy", async function () {
    const NodeManagerFactory = (await ethers.getContractFactory("NodeManager", {
      libraries: {
        FQDNRegex: fqdnRegex.address,
      },
    })) as NodeManager__factory;
    const nodeManager = (await upgrades.deployProxy(NodeManagerFactory, [], {
      kind: "uups",
      unsafeAllow: ["external-library-linking"],
    })) as NodeManager;
    await nodeManager.deployed();
  });

  it("NodeManagerUpgradeTest deploys succesfully", async function () {
    const NodeManagerUpgradeTestFactory = (await ethers.getContractFactory(
      "NodeManagerUpgradeTest",
      {
        libraries: {
          FQDNRegex: fqdnRegex.address,
        },
      }
    )) as NodeManagerUpgradeTest__factory;
    const nodeManagerUpgradeTest = (await upgrades.deployProxy(
      NodeManagerUpgradeTestFactory,
      [],
      {
        kind: "uups",
        unsafeAllow: ["external-library-linking"],
      }
    )) as NodeManagerUpgradeTest;
    await nodeManagerUpgradeTest.deployed();
    expect(await nodeManagerUpgradeTest.test()).to.equal(
      "Greetings from NodeManagerUpgradeTest"
    );
  });

  it("NodeManager upgrades to NodeManagerUpgradeTest succesfully", async function () {
    const NodeManagerFactory = (await ethers.getContractFactory("NodeManager", {
      libraries: {
        FQDNRegex: fqdnRegex.address,
      },
    })) as NodeManager__factory;
    const nodeManager = (await upgrades.deployProxy(NodeManagerFactory, [], {
      kind: "uups",
      unsafeAllow: ["external-library-linking"],
    })) as NodeManager;
    await nodeManager.deployed();

    const NodeManagerUpgradeTestFactory = (await ethers.getContractFactory(
      "NodeManagerUpgradeTest",
      {
        libraries: {
          FQDNRegex: fqdnRegex.address,
        },
      }
    )) as NodeManagerUpgradeTest__factory;

    await upgrades.upgradeProxy(
      nodeManager.address,
      NodeManagerUpgradeTestFactory,
      {
        kind: "uups",
        unsafeAllow: ["external-library-linking"],
      }
    );

    expect(await nodeManager.test()).to.equal(
      "Greetings from NodeManagerUpgradeTest"
    );
  });

  it("NodeManagerUpgradeTest reverts on downgrade to NodeManager", async function () {
    const NodeManagerUpgradeTestFactory = (await ethers.getContractFactory(
      "NodeManagerUpgradeTest",
      {
        libraries: {
          FQDNRegex: fqdnRegex.address,
        },
      }
    )) as NodeManagerUpgradeTest__factory;
    const nodeManagerUpgradeTest = (await upgrades.deployProxy(
      NodeManagerUpgradeTestFactory,
      [],
      {
        kind: "uups",
        unsafeAllow: ["external-library-linking"],
      }
    )) as NodeManagerUpgradeTest;
    await nodeManagerUpgradeTest.deployed();
    expect(await nodeManagerUpgradeTest.test()).to.equal(
      "Greetings from NodeManagerUpgradeTest"
    );

    const NodeManagerFactory = (await ethers.getContractFactory("NodeManager", {
      libraries: {
        FQDNRegex: fqdnRegex.address,
      },
    })) as NodeManager__factory;
    const nodeManager = (await upgrades.deployProxy(NodeManagerFactory, [], {
      kind: "uups",
      unsafeAllow: ["external-library-linking"],
    })) as NodeManager;
    await nodeManager.deployed();

    await expect(
      upgrades.upgradeProxy(
        nodeManagerUpgradeTest.address,
        NodeManagerFactory,
        {
          kind: "uups",
          unsafeAllow: ["external-library-linking"],
        }
      )
    ).to.be.revertedWith("Downgrade not allowed");

    expect(await nodeManagerUpgradeTest.test()).to.equal(
      "Greetings from NodeManagerUpgradeTest"
    );
  });

  describe("Basic Functions", function () {
    let nodeManager: NodeManager;
    let NodeManagerFactory: NodeManager__factory;
    before(async function () {
      NodeManagerFactory = (await ethers.getContractFactory("NodeManager", {
        libraries: {
          FQDNRegex: fqdnRegex.address,
        },
      })) as NodeManager__factory;
      nodeManager = (await upgrades.deployProxy(NodeManagerFactory, [], {
        kind: "uups",
        unsafeAllow: ["external-library-linking"],
      })) as NodeManager;
      await nodeManager.deployed();
    });
    it("NodeManager Should support IERC1822ProxiableUpgradeable", async function () {
      expect(
        await nodeManager.supportsInterface(IERC1822ProxiableUpgradeable)
      ).to.equal(true);
    });
    it("NodeManager Should support IAccessControlUpgradeable", async function () {
      expect(
        await nodeManager.supportsInterface(IAccessControlUpgradeable)
      ).to.equal(true);
    });
    it("NodeManager Should support NOT support NULL interface", async function () {
      expect(await nodeManager.supportsInterface("0x00000000")).to.equal(false);
    });

    it("NodeManager getContractVersion Should return contract Version", async function () {
      expect(await nodeManager.getContractVersion()).to.equal(1);
    });
    it("NodeManager test Should return Greetings", async function () {
      expect(await nodeManager.test()).to.equal("Greetings from NodeManager");
    });
    it("NodeManager rejects new a new node without a stake", async function () {
      const nodeHash = BigNumber.from(utils.randomBytes(32));
      const nodeFqdn = "node1.test";
      await expect(
        nodeManager.registerNode(nodeHash, nodeFqdn)
      ).to.be.revertedWith("Must transfer at least NODE_STAKE");
      expect(nodeManager.nodes.length === 0);
      const nodeRecord = await nodeManager.nodeHashToNode(nodeHash);
      expect(nodeRecord.fqdn).to.eq("");
      expect(nodeRecord.state).to.eq(0);
    });
    it("NodeManager accepts new a new node with a stake", async function () {
      const nodeHash = BigNumber.from(utils.randomBytes(32));
      const nodeFqdn = "node1.test";
      const overrides = {
        value: ethers.utils.parseEther("10"),
      };
      expect(await nodeManager.registerNode(nodeHash, nodeFqdn, overrides));
      const nodes = await nodeManager.nodes(0);
      expect(nodes.eq(nodeHash));
      const nodeRecord = await nodeManager.nodeHashToNode(nodeHash);
      expect(nodeRecord.fqdn).to.eq(nodeFqdn);
      expect(nodeRecord.nodeHash).to.eq(nodeHash);
      expect(nodeRecord.state).to.eq(NodeState.PENDING);
    });
    it("NodeManager accepts new a new node with an over stake", async function () {
      const nodeHash = BigNumber.from(utils.randomBytes(32));
      const nodeFqdn = "node1.test";
      const overrides = {
        value: ethers.utils.parseEther("20"),
      };
      expect(await nodeManager.registerNode(nodeHash, nodeFqdn, overrides));
      const nodes = await nodeManager.nodes(0);
      expect(nodes.eq(nodeHash));
      const nodeRecord = await nodeManager.nodeHashToNode(nodeHash);
      expect(nodeRecord.fqdn).to.eq(nodeFqdn);
      expect(nodeRecord.nodeHash).to.eq(nodeHash);
      expect(nodeRecord.state).to.eq(NodeState.PENDING);
      expect(
        await nodeManager.provider.getBalance(nodeManager.address)
      ).to.equal(ethers.utils.parseEther("20"));
    });
    it("NodeManager rejects a duplicate node", async function () {
      const nodeHash = BigNumber.from(utils.randomBytes(32));
      const nodeFqdn = "node1.test";
      const overrides = {
        value: ethers.utils.parseEther("10"),
      };
      expect(await nodeManager.registerNode(nodeHash, nodeFqdn, overrides));
      expect(nodeManager.nodes.length === 1);
      const nodes = await nodeManager.nodes(0);
      expect(nodes.eq(nodeHash));
      const nodeRecord = await nodeManager.nodeHashToNode(nodeHash);
      expect(nodeRecord.fqdn).to.eq(nodeFqdn);
      expect(nodeRecord.nodeHash).to.eq(nodeHash);
      expect(nodeRecord.state).to.eq(NodeState.PENDING);
      await expect(
        nodeManager.registerNode(nodeHash, nodeFqdn, overrides)
      ).to.be.revertedWith("Duplicate nodeHash");
      expect(nodeManager.nodes.length === 1);
    });
    it("NodeManager rejects an invalid fqdn", async function () {
      const nodeHash = BigNumber.from(utils.randomBytes(32));
      const nodeFqdn = "node1.11";
      const overrides = {
        value: ethers.utils.parseEther("10"),
      };
      await expect(
        nodeManager.registerNode(nodeHash, nodeFqdn, overrides)
      ).to.be.revertedWith("fqdn must match regex");
      expect(nodeManager.nodes.length === 1);
    });
    it("NodeManager rejects a too long fqdn", async function () {
      const nodeHash = BigNumber.from(utils.randomBytes(32));
      const nodeFqdn = "x".repeat(255) + "node1.com";
      const overrides = {
        value: ethers.utils.parseEther("10"),
      };
      await expect(
        nodeManager.registerNode(nodeHash, nodeFqdn, overrides)
      ).to.be.revertedWith("fqdn length must be less than 255");
      expect(nodeManager.nodes.length === 1);
    });

    it("NodeManager enrolls a node", async function () {
      const nodeHash = BigNumber.from(utils.randomBytes(32));
      const nodeFqdn = "node1.test";
      const overrides = {
        value: ethers.utils.parseEther("10"),
      };
      await nodeManager.registerNode(nodeHash, nodeFqdn, overrides);
      await expect(await nodeManager.enrollNode(nodeHash))
        .to.emit(nodeManager, "NewNode")
        .withArgs(nodeHash);
      {
        const nodes = await nodeManager.nodes(0);
        expect(nodes.eq(nodeHash));
        const nodeRecord = await nodeManager.nodeHashToNode(nodeHash);
        expect(nodeRecord.fqdn).to.eq(nodeFqdn);
        expect(nodeRecord.nodeHash).to.eq(nodeHash);
        expect(nodeRecord.state).to.eq(NodeState.SERVING); // SERVING
      }
    });
    it("NodeManager rejects enrollement when node not found", async function () {
      const nodeHash = BigNumber.from(utils.randomBytes(32));
      await expect(nodeManager.enrollNode(nodeHash)).to.be.revertedWith(
        "Node not found"
      );
    });
    it("NodeManager rejects enrollement when not node owner", async function () {
      const nodeHash = BigNumber.from(utils.randomBytes(32));
      const nodeFqdn = "node1.test";
      const [, addr1] = await ethers.getSigners();

      const overrides = {
        value: ethers.utils.parseEther("10"),
      };
      await nodeManager.registerNode(nodeHash, nodeFqdn, overrides);

      const altUser = nodeManager.connect(addr1);
      await expect(altUser.enrollNode(nodeHash)).to.be.revertedWith(
        "Must call from owning address"
      );
      {
        const nodeRecord = await nodeManager.nodeHashToNode(nodeHash);
        expect(nodeRecord.fqdn).to.eq(nodeFqdn);
        expect(nodeRecord.nodeHash).to.eq(nodeHash);
        expect(nodeRecord.state).to.eq(NodeState.PENDING);
      }
    });

    it("NodeManager starts exiting a node", async function () {
      const nodeHash = BigNumber.from(utils.randomBytes(32));
      const nodeFqdn = "node1.test";
      const overrides = {
        value: ethers.utils.parseEther("10"),
      };
      await nodeManager.registerNode(nodeHash, nodeFqdn, overrides);
      await expect(await nodeManager.enrollNode(nodeHash))
        .to.emit(nodeManager, "NewNode")
        .withArgs(nodeHash);

      await expect(await nodeManager.nodeExit(nodeHash))
        .to.emit(nodeManager, "NodeExitRequested")
        .withArgs(nodeHash);
      {
        const nodes = await nodeManager.nodes(0);
        expect(nodes.eq(nodeHash));
        const nodeRecord = await nodeManager.nodeHashToNode(nodeHash);
        expect(nodeRecord.fqdn).to.eq(nodeFqdn);
        expect(nodeRecord.nodeHash).to.eq(nodeHash);
        expect(nodeRecord.state).to.eq(NodeState.EXITING); // EXITING
      }
    });
    it("NodeManager rejects nodeExit when node not found", async function () {
      const nodeHash = BigNumber.from(utils.randomBytes(32));
      await expect(nodeManager.nodeExit(nodeHash)).to.be.revertedWith(
        "Node not found"
      );
    });

    it("NodeManager rejects nodeExit when not owner", async function () {
      const nodeHash = BigNumber.from(utils.randomBytes(32));
      const nodeFqdn = "node1.test";
      const [, addr1] = await ethers.getSigners();
      const overrides = {
        value: ethers.utils.parseEther("10"),
      };
      await nodeManager.registerNode(nodeHash, nodeFqdn, overrides);
      await expect(await nodeManager.enrollNode(nodeHash))
        .to.emit(nodeManager, "NewNode")
        .withArgs(nodeHash);

      const altUser = nodeManager.connect(addr1);
      await expect(altUser.nodeExit(nodeHash)).to.be.revertedWith(
        "Must call from owning address"
      );
      {
        const nodeRecord = await nodeManager.nodeHashToNode(nodeHash);
        expect(nodeRecord.fqdn).to.eq(nodeFqdn);
        expect(nodeRecord.nodeHash).to.eq(nodeHash);
        expect(nodeRecord.state).to.eq(NodeState.SERVING); // SERVING
      }
    });

    it("NodeManager an exit via nodeCrashExit", async function () {
      const nodeHash = BigNumber.from(utils.randomBytes(32));
      const nodeFqdn = "node1.test";
      const overrides = {
        value: ethers.utils.parseEther("10"),
      };
      await nodeManager.registerNode(nodeHash, nodeFqdn, overrides);
      await expect(await nodeManager.enrollNode(nodeHash))
        .to.emit(nodeManager, "NewNode")
        .withArgs(nodeHash);

      await expect(await nodeManager.nodeExit(nodeHash))
        .to.emit(nodeManager, "NodeExitRequested")
        .withArgs(nodeHash);
      {
        const nodeRecord = await nodeManager.nodeHashToNode(nodeHash);
        expect(nodeRecord.fqdn).to.eq(nodeFqdn);
        expect(nodeRecord.nodeHash).to.eq(nodeHash);
        expect(nodeRecord.state).to.eq(NodeState.EXITING); // EXITING
      }
      await expect(await nodeManager.nodeCrashExit(nodeHash))
        .to.emit(nodeManager, "NodeCrashExited")
        .withArgs(nodeHash);
      {
        const nodeRecord = await nodeManager.nodeHashToNode(nodeHash);
        expect(nodeRecord.fqdn).to.eq(nodeFqdn);
        expect(nodeRecord.nodeHash).to.eq(nodeHash);
        expect(nodeRecord.balance).to.eq(ethers.utils.parseEther("1")); // Slashed for crashing
        expect(nodeRecord.state).to.eq(NodeState.PENDING); // PENDING
      }
    });

    it("NodeManager rejects nodeCrashExit when node not found", async function () {
      const nodeHash = BigNumber.from(utils.randomBytes(32));
      await expect(nodeManager.nodeCrashExit(nodeHash)).to.be.revertedWith(
        "Node not found"
      );
    });

    it("NodeManager rejects nodeCrashExit when not owner", async function () {
      const nodeHash = BigNumber.from(utils.randomBytes(32));
      const nodeFqdn = "node1.test";
      const [, addr1] = await ethers.getSigners();

      const overrides = {
        value: ethers.utils.parseEther("10"),
      };
      await nodeManager.registerNode(nodeHash, nodeFqdn, overrides);
      await expect(await nodeManager.enrollNode(nodeHash))
        .to.emit(nodeManager, "NewNode")
        .withArgs(nodeHash);

      await expect(await nodeManager.nodeExit(nodeHash))
        .to.emit(nodeManager, "NodeExitRequested")
        .withArgs(nodeHash);
      {
        const nodeRecord = await nodeManager.nodeHashToNode(nodeHash);
        expect(nodeRecord.fqdn).to.eq(nodeFqdn);
        expect(nodeRecord.nodeHash).to.eq(nodeHash);
        expect(nodeRecord.state).to.eq(NodeState.EXITING); // EXITING
      }

      const altUser = nodeManager.connect(addr1);
      await expect(altUser.nodeCrashExit(nodeHash)).to.be.revertedWith(
        "Must call from owning address"
      );

      {
        const nodeRecord = await nodeManager.nodeHashToNode(nodeHash);
        expect(nodeRecord.fqdn).to.eq(nodeFqdn);
        expect(nodeRecord.nodeHash).to.eq(nodeHash);
        expect(nodeRecord.balance).to.eq(ethers.utils.parseEther("10"));
        expect(nodeRecord.state).to.eq(NodeState.EXITING); // EXITING
      }
    });

    it("NodeManager rejects nodeCrashExit when not Exiting", async function () {
      const nodeHash = BigNumber.from(utils.randomBytes(32));
      const nodeFqdn = "node1.test";

      const overrides = {
        value: ethers.utils.parseEther("10"),
      };
      await nodeManager.registerNode(nodeHash, nodeFqdn, overrides);
      await expect(await nodeManager.enrollNode(nodeHash))
        .to.emit(nodeManager, "NewNode")
        .withArgs(nodeHash);
      await expect(nodeManager.nodeCrashExit(nodeHash)).to.be.revertedWith(
        "Must only call for an EXITING Node"
      );

      {
        const nodeRecord = await nodeManager.nodeHashToNode(nodeHash);
        expect(nodeRecord.fqdn).to.eq(nodeFqdn);
        expect(nodeRecord.nodeHash).to.eq(nodeHash);
        expect(nodeRecord.balance).to.eq(ethers.utils.parseEther("10"));
        expect(nodeRecord.state).to.eq(NodeState.SERVING);
      }
    });

    it("NodeManager calls nodeCrashExit after some peers have finished evacuation", async function () {
      const nodeHash = BigNumber.from(utils.randomBytes(32));
      const nodeFqdn = "node1.test";
      const overrides = {
        value: ethers.utils.parseEther("10"),
      };
      await nodeManager.registerNode(nodeHash, nodeFqdn, overrides);
      await expect(await nodeManager.enrollNode(nodeHash))
        .to.emit(nodeManager, "NewNode")
        .withArgs(nodeHash);

      await expect(await nodeManager.nodeExit(nodeHash))
        .to.emit(nodeManager, "NodeExitRequested")
        .withArgs(nodeHash);
      {
        const nodeRecord = await nodeManager.nodeHashToNode(nodeHash);
        expect(nodeRecord.fqdn).to.eq(nodeFqdn);
        expect(nodeRecord.nodeHash).to.eq(nodeHash);
        expect(nodeRecord.state).to.eq(NodeState.EXITING); // EXITING
      }
      const earlierNode = await nodeManager.nodes(0);

      await nodeManager.nodeEvacuationComplete(nodeHash, earlierNode);

      await expect(await nodeManager.nodeCrashExit(nodeHash))
        .to.emit(nodeManager, "NodeCrashExited")
        .withArgs(nodeHash);
      {
        const nodeRecord = await nodeManager.nodeHashToNode(nodeHash);
        expect(nodeRecord.fqdn).to.eq(nodeFqdn);
        expect(nodeRecord.nodeHash).to.eq(nodeHash);
        expect(nodeRecord.balance).to.eq(ethers.utils.parseEther("1")); // Slashed for crashing
        expect(nodeRecord.state).to.eq(NodeState.PENDING); // PENDING
      }
    });

    it("All Nodes call nodeEvacuationComplete for exiting Node, that node ", async function () {
      const nodeHash = BigNumber.from(utils.randomBytes(32));
      const nodeFqdn = "node1.test";
      const overrides = {
        value: ethers.utils.parseEther("10"),
      };
      await nodeManager.registerNode(nodeHash, nodeFqdn, overrides);
      await expect(await nodeManager.enrollNode(nodeHash))
        .to.emit(nodeManager, "NewNode")
        .withArgs(nodeHash);

      // Create another Node so the one we're testing isn't the last in the nodes array
      {
        const nodeHash = BigNumber.from(utils.randomBytes(32));
        const nodeFqdn = "node1.test";
        const overrides = {
          value: ethers.utils.parseEther("10"),
        };
        await nodeManager.registerNode(nodeHash, nodeFqdn, overrides);
        await expect(await nodeManager.enrollNode(nodeHash))
          .to.emit(nodeManager, "NewNode")
          .withArgs(nodeHash);
      }

      await expect(await nodeManager.nodeExit(nodeHash))
        .to.emit(nodeManager, "NodeExitRequested")
        .withArgs(nodeHash);
      {
        const nodeRecord = await nodeManager.nodeHashToNode(nodeHash);
        expect(nodeRecord.fqdn).to.eq(nodeFqdn);
        expect(nodeRecord.nodeHash).to.eq(nodeHash);
        expect(nodeRecord.state).to.eq(NodeState.EXITING); // EXITING
      }

      const otherNodes: BigNumber[] = [];
      for (let i = 0; ; ++i) {
        const earlierNode = await (async () => {
          try {
            return await nodeManager.nodes(i);
          } catch (ex) {
            // ignored as the index out of bounds will have thrown
          }
        })();

        if (!earlierNode) {
          break;
        }

        if (!earlierNode.eq(nodeHash)) {
          otherNodes.push(earlierNode);
        }
      }

      for (let i = 0; i < otherNodes.length; ++i) {
        if (i === otherNodes.length) {
          await expect(
            nodeManager.nodeEvacuationComplete(nodeHash, otherNodes[i])
          )
            .to.emit(nodeManager, "NodeEvacuated")
            .withArgs(nodeHash);
        } else {
          await nodeManager.nodeEvacuationComplete(nodeHash, otherNodes[i]);
        }
      }

      {
        const nodeRecord = await nodeManager.nodeHashToNode(nodeHash);
        expect(nodeRecord.fqdn).to.eq(nodeFqdn);
        expect(nodeRecord.nodeHash).to.eq(nodeHash);
        expect(nodeRecord.balance).to.eq(ethers.utils.parseEther("10")); // Slashed for crashing
        expect(nodeRecord.state).to.eq(NodeState.PENDING); // PENDING
      }

      await expect(await nodeManager.unregisterNode(nodeHash))
        .to.emit(nodeManager, "NodeUnregistered")
        .withArgs(nodeHash);
      {
        const nodeRecord = await nodeManager.nodeHashToNode(nodeHash);
        expect(nodeRecord.fqdn).to.eq("");
        expect(nodeRecord.nodeHash).to.eq(0);
        expect(nodeRecord.state).to.eq(NodeState.UNINITIALIZED);
      }
    });

    it("All Nodes call nodeEvacuationComplete from wrong owner", async function () {
      const nodeHash = BigNumber.from(utils.randomBytes(32));
      const nodeFqdn = "node1.test";
      const [, addr1] = await ethers.getSigners();

      const overrides = {
        value: ethers.utils.parseEther("10"),
      };
      const altUser = nodeManager.connect(addr1);

      await nodeManager.registerNode(nodeHash, nodeFqdn, overrides);
      await expect(await nodeManager.enrollNode(nodeHash))
        .to.emit(nodeManager, "NewNode")
        .withArgs(nodeHash);

      await expect(await nodeManager.nodeExit(nodeHash))
        .to.emit(nodeManager, "NodeExitRequested")
        .withArgs(nodeHash);
      {
        const nodeRecord = await nodeManager.nodeHashToNode(nodeHash);
        expect(nodeRecord.fqdn).to.eq(nodeFqdn);
        expect(nodeRecord.nodeHash).to.eq(nodeHash);
        expect(nodeRecord.state).to.eq(NodeState.EXITING); // EXITING
      }

      for (let i = 0; ; ++i) {
        const earlierNode = await (async () => {
          try {
            return await nodeManager.nodes(i);
          } catch (ex) {
            // ignored as the index out of bounds will have thrown
          }
        })();

        if (!earlierNode) {
          break;
        }

        if (!earlierNode.eq(nodeHash)) {
          await expect(
            altUser.nodeEvacuationComplete(nodeHash, earlierNode)
          ).to.be.revertedWith("Must call from owning address");
        }
      }

      for (let i = 0; ; ++i) {
        const earlierNode = await (async () => {
          try {
            return await nodeManager.nodes(i);
          } catch (ex) {
            // ignored as the index out of bounds will have thrown
          }
        })();

        if (!earlierNode) {
          break;
        }

        if (!earlierNode.eq(nodeHash)) {
          await expect(
            nodeManager.nodeEvacuationComplete(nodeHash, earlierNode.add(1))
          ).to.be.revertedWith("Node not found");
        }
      }

      for (let i = 0; ; ++i) {
        const earlierNode = await (async () => {
          try {
            return await nodeManager.nodes(i);
          } catch (ex) {
            // ignored as the index out of bounds will have thrown
          }
        })();

        if (!earlierNode) {
          break;
        }

        if (!earlierNode.eq(nodeHash)) {
          await expect(
            nodeManager.nodeEvacuationComplete(nodeHash.add(1), earlierNode)
          ).to.be.revertedWith("Node not found");
        }
      }

      {
        const nodeRecord = await nodeManager.nodeHashToNode(nodeHash);
        expect(nodeRecord.fqdn).to.eq(nodeFqdn);
        expect(nodeRecord.nodeHash).to.eq(nodeHash);
        expect(nodeRecord.balance).to.eq(ethers.utils.parseEther("10"));
        expect(nodeRecord.state).to.eq(NodeState.EXITING); // Since all of the above revereted
      }
    });

    it("Call nodeEvacuationComplete for running server", async function () {
      const nodeHash = BigNumber.from(utils.randomBytes(32));
      const nodeFqdn = "node1.test";

      const overrides = {
        value: ethers.utils.parseEther("10"),
      };

      await nodeManager.registerNode(nodeHash, nodeFqdn, overrides);
      await expect(await nodeManager.enrollNode(nodeHash))
        .to.emit(nodeManager, "NewNode")
        .withArgs(nodeHash);

      const earlierNode = await (async () => {
        try {
          return await nodeManager.nodes(0);
        } catch (ex) {
          // ignored as the index out of bounds will have thrown
        }
      })();

      if (earlierNode) {
        await expect(
          nodeManager.nodeEvacuationComplete(nodeHash, earlierNode)
        ).to.be.revertedWith("Must only call for a EXITING Node");
      }

      {
        const nodeRecord = await nodeManager.nodeHashToNode(nodeHash);
        expect(nodeRecord.fqdn).to.eq(nodeFqdn);
        expect(nodeRecord.nodeHash).to.eq(nodeHash);
        expect(nodeRecord.balance).to.eq(ethers.utils.parseEther("10"));
        expect(nodeRecord.state).to.eq(NodeState.SERVING); // Since all of the above revereted
      }
    });

    it("All Nodes call nodeEvacuationComplete on Node with no peers", async function () {
      // Create a new empty contract so the new node has now peers
      const nodeManager = (await upgrades.deployProxy(NodeManagerFactory, [], {
        kind: "uups",
        unsafeAllow: ["external-library-linking"],
      })) as NodeManager;
      await nodeManager.deployed();
      const nodeHash = BigNumber.from(utils.randomBytes(32));
      const nodeFqdn = "node1.test";
      const overrides = {
        value: ethers.utils.parseEther("10"),
      };
      await nodeManager.registerNode(nodeHash, nodeFqdn, overrides);
      await expect(await nodeManager.enrollNode(nodeHash))
        .to.emit(nodeManager, "NewNode")
        .withArgs(nodeHash);

      await expect(await nodeManager.nodeExit(nodeHash))
        .to.emit(nodeManager, "NodeExitRequested")
        .withArgs(nodeHash);
      {
        const nodeRecord = await nodeManager.nodeHashToNode(nodeHash);
        expect(nodeRecord.fqdn).to.eq(nodeFqdn);
        expect(nodeRecord.nodeHash).to.eq(nodeHash);
        expect(nodeRecord.state).to.eq(NodeState.EXITING); // EXITING
      }

      // Create a new node after the first node shutdown, to use for testing
      const node2Hash = BigNumber.from(utils.randomBytes(32));
      {
        const nodeFqdn = "node2.test";
        const overrides = {
          value: ethers.utils.parseEther("10"),
        };
        await nodeManager.registerNode(node2Hash, nodeFqdn, overrides);
        await expect(await nodeManager.enrollNode(node2Hash))
          .to.emit(nodeManager, "NewNode")
          .withArgs(node2Hash);
      }
      await expect(
        nodeManager.nodeEvacuationComplete(nodeHash, node2Hash)
      ).to.revertedWith("Must only call with Peers");
    });

    it("All Nodes call nodeEvacuationComplete on Node with no peers", async function () {
      const nodeHash = BigNumber.from(utils.randomBytes(32));
      const nodeFqdn = "node1.test";
      const overrides = {
        value: ethers.utils.parseEther("10"),
      };
      await nodeManager.registerNode(nodeHash, nodeFqdn, overrides);
      await expect(await nodeManager.enrollNode(nodeHash))
        .to.emit(nodeManager, "NewNode")
        .withArgs(nodeHash);

      await expect(await nodeManager.nodeExit(nodeHash))
        .to.emit(nodeManager, "NodeExitRequested")
        .withArgs(nodeHash);
      {
        const nodeRecord = await nodeManager.nodeHashToNode(nodeHash);
        expect(nodeRecord.fqdn).to.eq(nodeFqdn);
        expect(nodeRecord.nodeHash).to.eq(nodeHash);
        expect(nodeRecord.state).to.eq(NodeState.EXITING); // EXITING
      }

      const earlierNode = await (async () => {
        try {
          return await nodeManager.nodes(0);
        } catch (ex) {
          // ignored as the index out of bounds will have thrown
        }
      })();

      if (earlierNode) {
        await nodeManager.nodeEvacuationComplete(nodeHash, earlierNode);
        await expect(
          nodeManager.nodeEvacuationComplete(nodeHash, earlierNode)
        ).to.revertedWith("Must call only when PeerExitState = PENDING");
      }
    });

    it("All Nodes call unregisterNode from not owner", async function () {
      const nodeHash = BigNumber.from(utils.randomBytes(32));
      const nodeFqdn = "node1.test";
      const overrides = {
        value: ethers.utils.parseEther("10"),
      };

      const [, addr1] = await ethers.getSigners();

      const altUser = nodeManager.connect(addr1);

      await nodeManager.registerNode(nodeHash, nodeFqdn, overrides);
      await expect(await nodeManager.enrollNode(nodeHash))
        .to.emit(nodeManager, "NewNode")
        .withArgs(nodeHash);

      await expect(await nodeManager.nodeExit(nodeHash))
        .to.emit(nodeManager, "NodeExitRequested")
        .withArgs(nodeHash);
      {
        const nodeRecord = await nodeManager.nodeHashToNode(nodeHash);
        expect(nodeRecord.fqdn).to.eq(nodeFqdn);
        expect(nodeRecord.nodeHash).to.eq(nodeHash);
        expect(nodeRecord.state).to.eq(NodeState.EXITING); // EXITING
      }

      const otherNodes: BigNumber[] = [];
      for (let i = 0; ; ++i) {
        const earlierNode = await (async () => {
          try {
            return await nodeManager.nodes(i);
          } catch (ex) {
            // ignored as the index out of bounds will have thrown
          }
        })();

        if (!earlierNode) {
          break;
        }

        if (!earlierNode.eq(nodeHash)) {
          otherNodes.push(earlierNode);
        }
      }

      for (let i = 0; i < otherNodes.length; ++i) {
        if (i === otherNodes.length) {
          await expect(
            nodeManager.nodeEvacuationComplete(nodeHash, otherNodes[i])
          )
            .to.emit(nodeManager, "NodeEvacuated")
            .withArgs(nodeHash);
        } else {
          await nodeManager.nodeEvacuationComplete(nodeHash, otherNodes[i]);
        }
      }

      {
        const nodeRecord = await nodeManager.nodeHashToNode(nodeHash);
        expect(nodeRecord.fqdn).to.eq(nodeFqdn);
        expect(nodeRecord.nodeHash).to.eq(nodeHash);
        expect(nodeRecord.balance).to.eq(ethers.utils.parseEther("10")); // Slashed for crashing
        expect(nodeRecord.state).to.eq(NodeState.PENDING); // PENDING
      }

      await expect(altUser.unregisterNode(nodeHash)).to.revertedWith(
        "Must call from owning address"
      );
      {
        const nodeRecord = await nodeManager.nodeHashToNode(nodeHash);
        expect(nodeRecord.state).to.eq(NodeState.PENDING);
      }
    });

    it("All Nodes call unregisterNode from a non-register node", async function () {
      const nodeHash = BigNumber.from(utils.randomBytes(32));
      const nodeFqdn = "node1.test";
      const overrides = {
        value: ethers.utils.parseEther("10"),
      };

      await nodeManager.registerNode(nodeHash, nodeFqdn, overrides);
      await expect(await nodeManager.enrollNode(nodeHash))
        .to.emit(nodeManager, "NewNode")
        .withArgs(nodeHash);

      await expect(await nodeManager.nodeExit(nodeHash))
        .to.emit(nodeManager, "NodeExitRequested")
        .withArgs(nodeHash);
      {
        const nodeRecord = await nodeManager.nodeHashToNode(nodeHash);
        expect(nodeRecord.fqdn).to.eq(nodeFqdn);
        expect(nodeRecord.nodeHash).to.eq(nodeHash);
        expect(nodeRecord.state).to.eq(NodeState.EXITING); // EXITING
      }

      const otherNodes: BigNumber[] = [];
      for (let i = 0; ; ++i) {
        const earlierNode = await (async () => {
          try {
            return await nodeManager.nodes(i);
          } catch (ex) {
            // ignored as the index out of bounds will have thrown
          }
        })();

        if (!earlierNode) {
          break;
        }

        if (!earlierNode.eq(nodeHash)) {
          otherNodes.push(earlierNode);
        }
      }

      for (let i = 0; i < otherNodes.length; ++i) {
        if (i === otherNodes.length) {
          await expect(
            nodeManager.nodeEvacuationComplete(nodeHash, otherNodes[i])
          )
            .to.emit(nodeManager, "NodeEvacuated")
            .withArgs(nodeHash);
        } else {
          await nodeManager.nodeEvacuationComplete(nodeHash, otherNodes[i]);
        }
      }

      {
        const nodeRecord = await nodeManager.nodeHashToNode(nodeHash);
        expect(nodeRecord.fqdn).to.eq(nodeFqdn);
        expect(nodeRecord.nodeHash).to.eq(nodeHash);
        expect(nodeRecord.balance).to.eq(ethers.utils.parseEther("10")); // Slashed for crashing
        expect(nodeRecord.state).to.eq(NodeState.PENDING); // PENDING
      }

      await expect(nodeManager.unregisterNode(nodeHash.add(1))).to.revertedWith(
        "Node not found"
      );
      {
        const nodeRecord = await nodeManager.nodeHashToNode(nodeHash);
        expect(nodeRecord.state).to.eq(NodeState.PENDING);
      }
    });

    it("Call unregisterNode for a running server", async function () {
      const nodeHash = BigNumber.from(utils.randomBytes(32));
      const nodeFqdn = "node1.test";
      const overrides = {
        value: ethers.utils.parseEther("10"),
      };

      await nodeManager.registerNode(nodeHash, nodeFqdn, overrides);
      await expect(await nodeManager.enrollNode(nodeHash))
        .to.emit(nodeManager, "NewNode")
        .withArgs(nodeHash);

      await expect(await nodeManager.nodeExit(nodeHash))
        .to.emit(nodeManager, "NodeExitRequested")
        .withArgs(nodeHash);
      {
        const nodeRecord = await nodeManager.nodeHashToNode(nodeHash);
        expect(nodeRecord.fqdn).to.eq(nodeFqdn);
        expect(nodeRecord.nodeHash).to.eq(nodeHash);
        expect(nodeRecord.state).to.eq(NodeState.EXITING); // EXITING
      }

      await expect(nodeManager.unregisterNode(nodeHash)).to.revertedWith(
        "Must only call for a PENDING Node"
      );
      {
        const nodeRecord = await nodeManager.nodeHashToNode(nodeHash);
        expect(nodeRecord.state).to.eq(NodeState.EXITING);
      }
    });
  });
});
