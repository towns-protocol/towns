import { keccak256 } from "ethers/lib/utils";
import { network, ethers } from "hardhat";
import MerkleTree from "merkletreejs";

async function main(allowlist: any, address: string, allowance: number) {
  const chainId = network.config.chainId!.toString();
  console.log(`ChainId is ${chainId}`);

  const allowlistLeaves = Object.entries(allowlist).map((token) =>
    hashAllowlistToken(...token)
  );

  const allowlistTree = new MerkleTree(allowlistLeaves, keccak256, {
    sortPairs: true,
  });

  const mintLeaf = await hashAllowlistToken(address, allowance);
  const mintProof = allowlistTree.getHexProof(mintLeaf);

  if (allowlistTree.verify(mintProof, mintLeaf, allowlistTree.getHexRoot())) {
    console.log("Proof is valid");
    console.log("Hex Root: ", allowlistTree.getHexRoot());
  } else {
    console.log("Proof is invalid");
  }
}

export function hashAllowlistToken(address: any, allowance: any) {
  return Buffer.from(
    ethers.utils
      .solidityKeccak256(["address", "uint256"], [address, allowance])
      .slice(2),
    "hex"
  );
}

const allowlist = {
  "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266": 1,
  "0x70997970c51812dc3a010c7d01b50e0d17dc79c8": 1,
  "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc": 0,
  "0x90f79bf6eb2c4f870365e785982e1f101e93b906": 0,
};

const address = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
const allowance = 1;

main(allowlist, address, allowance)
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
