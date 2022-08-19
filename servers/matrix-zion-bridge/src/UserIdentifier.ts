import { ethers } from "ethers";

export interface UserIdentifier {
  readonly namespace: string;
  readonly accountAddress: string;
  readonly chainId: number;
  readonly chainAgnosticId: string;
  readonly matrixUserId: string | undefined;
  readonly matrixUserIdLocalpart: string;
  readonly serverName: string | undefined;
}

export function createUserIdFromString(
  matrixUserId: string
): UserIdentifier | undefined {
  let namespace: string | undefined;
  let chainId: number | undefined;
  let accountAddress: string | undefined;
  let serverName: string | undefined;

  const regex =
    /^@(?<namespace>.*)=3a(?<chainId>.*)=3a(?<accountAddress>.*):(?<serverName>.*)/;
  const match = regex.exec(matrixUserId);

  if (match) {
    namespace = match.groups?.namespace;
    switch (namespace) {
      case "eip155": {
        try {
          chainId = match.groups?.chainId
            ? parseInt(match.groups?.chainId)
            : undefined;
          accountAddress = match.groups?.accountAddress;
          accountAddress = accountAddress
            ? ethers.utils.getAddress(accountAddress)
            : undefined;
          serverName = match.groups?.serverName;
        } catch {}
        if (namespace && chainId && accountAddress && serverName) {
          return {
            namespace: "eip155",
            accountAddress,
            chainId,
            // https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-10.md
            chainAgnosticId: `eip155:${chainId}:${accountAddress}`,
            // https://spec.matrix.org/v1.1/appendices/#user-identifiers
            matrixUserIdLocalpart: `eip155=3a${chainId}=3a${accountAddress}`,
            matrixUserId,
            serverName,
          };
        }
        break;
      }
      // Todo: support other namespaces.
      default:
        break;
    }
  }

  return undefined;
}
