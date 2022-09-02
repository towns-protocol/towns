export const LoginTypePublicKey = "m.login.publickey";
export const LoginTypePublicKeyEthereum = "m.login.publickey.ethereum";

export enum LoginStatus {
  LoggedIn = "LoggedIn",
  LoggingIn = "LoggingIn",
  LoggingOut = "LoggingOut",
  LoggedOut = "LoggedOut",
  Registering = "Registering",
}

export interface AuthenticationError {
  code: number;
  message: string;
}

interface UserInteractiveFlow {
  stages: string[];
}

export interface PublicKeyEtheremParams {
  version: number;
  chain_ids: number[];
}

export interface LoginFlows {
  flows: LoginFlow[];
}
export interface AuthenticationData {
  type: string;
  user_id: string;
  session: string;
  message: string;
  signature: string;
}

export interface RegistrationAuthentication {
  type: string;
  session: string;
  public_key_response: AuthenticationData;
}

export interface RegisterRequest {
  // https://spec.matrix.org/v1.2/client-server-api/#post_matrixclientv3register
  auth: RegistrationAuthentication;
  username: string; // wallet address
  inhibit_login?: boolean;
  device_id?: string;
  initial_device_display_name?: string;
}

export interface Eip4361Info {
  authority: string; // is the RFC 3986 authority that is requesting the signing.
  address: string; // is the Ethereum address performing the signing conformant to capitalization encoded checksum specified in EIP-55 where applicable.
  version: string; // version of the Matrix public key spec that the client is complying with.
  chainId: number; // is the EIP-155 Chain ID to which the session is bound, and the network where Contract Accounts must be resolved.
  statement: string; // is a human-readable ASCII assertion that the user will sign, and it must not contain '\n' (the byte 0x0a).
}

export interface LoginServerResponse {
  accessToken: string | undefined;
  userId: string | undefined;
  deviceId: string | undefined;
  error?: string;
}

interface UserInteractive {
  completed: string[];
  flows: UserInteractiveFlow[];
  session: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: any;
}

interface LoginFlow {
  type: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isLoginFlowPublicKeyEthereum(o: any): o is UserInteractive {
  if ((o as UserInteractive).flows !== undefined) {
    const flows = (o as UserInteractive).flows;
    for (const f of flows) {
      if (f.stages.includes(LoginTypePublicKeyEthereum)) {
        return true;
      }
    }
  }

  return false;
}

export function getParamsPublicKeyEthereum(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  p: any,
): PublicKeyEtheremParams | undefined {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const params = p[LoginTypePublicKeyEthereum];
  if (params !== undefined) {
    return params as PublicKeyEtheremParams;
  }
  return undefined;
}

export function getChainIdEip155(chainId: string): number {
  if (chainId.startsWith("0x")) {
    return parseInt(chainId, 16);
  } else {
    return parseInt(chainId);
  }
}

export function getChainHexString(chainId: number): string {
  return chainId.toString(16);
}

// https://chainlist.org/
// https://eips.ethereum.org/EIPS/eip-155#list-of-chain-ids
export function getChainName(chainId: number): string {
  switch (chainId) {
    case 1:
      return "Ethereum Mainnet";
    case 2:
      return "Expanse Mainnet";
    case 3:
      return "Ropsten Test Network";
    case 4:
      return "Rinkeby Test Network";
    case 5:
      return "Goerli Test Network";
    case 42:
      return "Kovan Test Network";
    case 56:
      return "Binance Smart Chain Mainnet";
    case 137:
      return "Polygon Mainnet";
    case 42161:
      return "Arbitrum One";
    case 10:
      return "Optimism";
    case 100:
      return "Gnosis Chain";
    case 1337:
      return "Geth private chains";
    default:
      return chainId.toString();
  }
}
