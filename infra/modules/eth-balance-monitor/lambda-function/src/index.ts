import {
    APIGatewayProxyEvent,
    APIGatewayProxyResult,
    Context,
    Handler,
  } from "aws-lambda";
  import { client, v2 } from "@datadog/datadog-api-client";
  import { SecretsManager } from "@aws-sdk/client-secrets-manager";
  import { Client, PublicClient, createPublicClient, http as httpViem, isAddress } from "viem";

  type WalletBalance = { 
    walletAddress: string; 
    balance: number; 
    chain: string;
  };
  
  const riverRegistryAbi = [
    {
      type: "function",
      name: "getAllNodeAddresses",
      inputs: [],
      outputs: [
        {
          name: "",
          type: "address[]",
          internalType: "address[]",
        },
      ],
      stateMutability: "view",
    },
  ];
  
  const KNOWN_NODES: Record<string, number> = {
    "0xBF2Fe1D28887A0000A1541291c895a26bD7B1DdD": 1,
    "0x43EaCe8E799497f8206E579f7CCd1EC41770d099": 2,
    "0x4E9baef70f7505fda609967870b8b489AF294796": 3,
    "0xae2Ef76C62C199BC49bB38DB99B29726bD8A8e53": 4,
    "0xC4f042CD5aeF82DB8C089AD0CC4DD7d26B2684cB": 5,
    "0x9BB3b35BBF3FA8030cCdb31030CF78039A0d0D9b": 6,
    "0x582c64BA11bf70E0BaC39988Cd3Bf0b8f40BDEc4": 7,
    "0x9df6e5F15ec682ca58Df6d2a831436973f98fe60": 8,
    "0xB79FaCbFC07Bff49cD2e2971305Da0DF7aCa9bF8": 9,
    "0xA278267f396a317c5Bb583f47F7f2792Bc00D3b3": 10,
    "0x75b5eb02D2fE5E2F0008a05849d81526963886C2": 11,
  };
  
  // Handler function for Lambda
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export const handler: Handler = async (
    _event: APIGatewayProxyEvent,
    context: Context
  ): Promise<APIGatewayProxyResult> => {
    const {
      DATADOG_API_KEY_SECRET_ARN,
      ENVIRONMENT,
      RIVER_CHAIN_RPC_URL_SECRET_ARN,
      BASE_CHAIN_RPC_URL_SECRET_ARN,
      DATADOG_APPLICATION_KEY_SECRET_ARN,
      RIVER_REGISTRY_CONTRACT_ADDRESS,
    } = getEnvConfig();
    const datadogApiKey = await getSecretValue(DATADOG_API_KEY_SECRET_ARN);
    const datadogApplicationKey = await getSecretValue(
      DATADOG_APPLICATION_KEY_SECRET_ARN
    );
    const riverChainRpcUrl = await getSecretValue(RIVER_CHAIN_RPC_URL_SECRET_ARN);
    const riverChainClient = createPublicClient({
      transport: httpViem(riverChainRpcUrl),
    });

    const baseChainRpcUrl = await getSecretValue(BASE_CHAIN_RPC_URL_SECRET_ARN);
    const baseChainClient = createPublicClient({
      transport: httpViem(baseChainRpcUrl),
    });
  
    const nodeAddresses = await getNodeAddresses(
      riverChainClient,
      RIVER_REGISTRY_CONTRACT_ADDRESS
    );
    console.log(`Got node addresses`, nodeAddresses);

    console.log('Getting wallet balances for base chain')
    const baseChainWalletBalances = await getWalletBalances(baseChainClient, nodeAddresses, 'base');
    console.log(`Got base chain wallet balances`, baseChainWalletBalances);

    console.log('Getting wallet balances for river chain')
    const riverChainWalletBalances = await getWalletBalances(riverChainClient, nodeAddresses, 'river');
    console.log(`Got river chain wallet balances`, riverChainWalletBalances);

    console.log(`Posting wallet balances to Datadog`);
    await postWalletBalancesToDatadog({
      walletBalances: riverChainWalletBalances.concat(baseChainWalletBalances),
      env: ENVIRONMENT,
      datadogApiKey,
      datadogApplicationKey,
    });
  
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Successfully posted wallet balances to Datadog for ${ENVIRONMENT}`,
      }),
    };
  };
  
  async function getNodeAddresses(
    client: PublicClient,
    riverRegistryContractAddress: string
  ) {
    const nodeAddresses = await client.readContract({
      abi: riverRegistryAbi,
      address: riverRegistryContractAddress as any,
      functionName: "getAllNodeAddresses",
    });
  
    return nodeAddresses as string[];
  }

  async function getWalletBalance(client: PublicClient, walletAddress: string, chain: string) {
    console.log(`Getting balance for wallet ${walletAddress}`);
    if (!isAddress(walletAddress)) {
        throw new Error(`Invalid wallet address: ${walletAddress}`);
    }
    const balanceBigInt = await client.getBalance({
        address: walletAddress,
        blockTag: "latest",
    });
    const balanceNum = Number(balanceBigInt);
    const balance = balanceNum / 10**18;
    console.log(`Got balance for wallet ${walletAddress}: ${balance}`);
    return { walletAddress, balance, chain };
  }
  
  async function getWalletBalances(client: PublicClient, walletAddresses: string[], chain: string) {
    const waleltBalancePromises = walletAddresses.map((walletAddress) => getWalletBalance(client, walletAddress, chain));
    return await Promise.all(
      waleltBalancePromises
    );
  }
  
  async function postWalletBalancesToDatadog({
    walletBalances,
    datadogApiKey,
    datadogApplicationKey,
    env,
  }: {
    walletBalances: WalletBalance[];
    datadogApiKey: string;
    datadogApplicationKey: string;
    env: string;
  }) {
    console.log("Posting wallet balances to Datadog:");
    const configuration = client.createConfiguration({
      authMethods: {
        apiKeyAuth: datadogApiKey,
        appKeyAuth: datadogApplicationKey,
      },
    });
    const timestamp = Math.floor(Date.now() / 1000);
    const series = walletBalances.map(({ walletAddress, balance, chain }) => {
      const tags = [`env:${env}`, `wallet_address:${walletAddress}`];
      const nodeNumber = KNOWN_NODES[walletAddress];
      if (typeof KNOWN_NODES[walletAddress] === "number") {
        tags.push(`node_number:${nodeNumber}`);
      }
      tags.push(`chain:${chain}`)
      return {
        metric: `river_node.wallet_balance`,
        points: [{ timestamp, value: balance }],
        tags,
      };
    });
    console.log("Series:", JSON.stringify(series, null, 2));
    const params: v2.MetricsApiSubmitMetricsRequest = {
      body: {
        series,
      },
    };
    const apiInstance = new v2.MetricsApi(configuration);
  
    return apiInstance
      .submitMetrics(params)
      .then((data: v2.IntakePayloadAccepted) => {
        console.log(
          "API called successfully. Returned data: " + JSON.stringify(data)
        );
      })
      .catch((error: any) => console.error(error));
  }
  
  async function getSecretValue(secretArn: string): Promise<string> {
    const secretsManager = new SecretsManager({ region: "us-east-1" });
    const secretValue = await secretsManager.getSecretValue({
      SecretId: secretArn,
    });
    const secretString = secretValue.SecretString;
    if (typeof secretString !== "string") {
      throw new Error(`Secret value for ${secretArn} is not a string`);
    }
    return secretString;
  }
  
  function getEnvConfig() {
    const {
      ENVIRONMENT,
      DATADOG_API_KEY_SECRET_ARN,
      DATADOG_APPLICATION_KEY_SECRET_ARN,
      RIVER_REGISTRY_CONTRACT_ADDRESS,
      RIVER_CHAIN_RPC_URL_SECRET_ARN,
      BASE_CHAIN_RPC_URL_SECRET_ARN,
    } = process.env;
    if (typeof ENVIRONMENT !== "string" || !ENVIRONMENT.trim().length) {
      throw new Error("ENVIRONMENT is not defined");
    }
    if (
      typeof DATADOG_API_KEY_SECRET_ARN !== "string" ||
      !DATADOG_API_KEY_SECRET_ARN.trim().length
    ) {
      throw new Error("DATADOG_API_KEY_SECRET_ARN is not defined");
    }
    if (
      typeof RIVER_CHAIN_RPC_URL_SECRET_ARN !== "string" ||
      !RIVER_CHAIN_RPC_URL_SECRET_ARN.trim().length
    ) {
      throw new Error("RIVER_CHAIN_RPC_URL_SECRET_ARN is not defined");
    }
    if (
      typeof BASE_CHAIN_RPC_URL_SECRET_ARN !== "string" ||
      !BASE_CHAIN_RPC_URL_SECRET_ARN.trim().length
    ) {
      throw new Error("BASE_CHAIN_RPC_URL_SECRET_ARN is not defined");
    }
    if (
      typeof DATADOG_APPLICATION_KEY_SECRET_ARN !== "string" ||
      !DATADOG_APPLICATION_KEY_SECRET_ARN.trim().length
    ) {
      throw new Error("DATADOG_APPLICATION_KEY_SECRET_ARN is not defined");
    }
    if (
      typeof RIVER_REGISTRY_CONTRACT_ADDRESS !== "string" ||
      !RIVER_REGISTRY_CONTRACT_ADDRESS.trim().length
    ) {
      throw new Error("RIVER_REGISTRY_CONTRACT_ADDRESS is not defined");
    }
    return {
      ENVIRONMENT,
      DATADOG_API_KEY_SECRET_ARN,
      DATADOG_APPLICATION_KEY_SECRET_ARN,
      RIVER_CHAIN_RPC_URL_SECRET_ARN,
      BASE_CHAIN_RPC_URL_SECRET_ARN,
      RIVER_REGISTRY_CONTRACT_ADDRESS,
    };
  }
  