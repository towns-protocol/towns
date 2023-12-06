const {SecretsManagerClient, GetSecretValueCommand, PutSecretValueCommand} = require('@aws-sdk/client-secrets-manager')
const {Signer} = require('@aws-sdk/rds-signer')
const {Client} = require('pg');
const crypto = require('crypto');

const Wallet = require('ethereumjs-wallet');
const EthereumUtil = require('ethereumjs-util');

const LAMBDA_DB_USER='root'
const CHAIN_ID = 84531;
const BASE_URL = `https://nexus-rpc-worker-test-beta.towns.com/${CHAIN_ID}`

function generatePassword(length = 12) {
  return crypto.randomBytes(length).toString('base64').slice(0, length);
}

function generatePostgresPassword() {
  const PG_PASSWORD_LENGTH = 32;
  let password = generatePassword(PG_PASSWORD_LENGTH);
  while (
    password.includes("'") || 
    password.includes('"') || 
    password.includes('\\') || 
    password.includes(';')
  ) {
    console.log('regenerating password')
    password = generatePassword(PG_PASSWORD_LENGTH);
  }
  console.log('generated password.');
  return password;
}

function generateFromPrivateKey(privateKey) {
  console.log('generating from private key')
  // Ensure the private key starts with '0x'
  if (!privateKey.startsWith('0x')) {
      privateKey = '0x' + privateKey;
  }

  // Create a wallet from the private key
  return Wallet.default.fromPrivateKey(EthereumUtil.toBuffer(privateKey));
}

async function getOrSetWalletPrivateKey() {
  console.log('getting or setting wallet private key')
  const secretsClient = new SecretsManagerClient({ region: "us-east-1" })
  const getSecretCommand = new GetSecretValueCommand({
    SecretId: process.env.RIVER_NODE_WALLET_CREDENTIALS_ARN
  })
  const secretRaw = await secretsClient.send(getSecretCommand);
  const secretParsed = JSON.parse(secretRaw.SecretString)
  let privateKey;
  if (secretParsed.walletPathPrivateKey === 'DUMMY') {
    const wallet = Wallet.default.generate();
    const hexPrivateKey = wallet.getPrivateKeyString();
    privateKey = hexPrivateKey.substring(2);
    const putSecretCommand = new PutSecretValueCommand({
      SecretId: process.env.RIVER_NODE_WALLET_CREDENTIALS_ARN,
      SecretString: JSON.stringify({
        walletPathPrivateKey: privateKey,
      })
    })
    await secretsClient.send(putSecretCommand);
  } else {
    privateKey = secretParsed.walletPathPrivateKey;
  }

  return privateKey;
}

async function setHomechainNetworkUrlSecret() {
  console.log('setting homechain network url secret - start')
  const secretsClient = new SecretsManagerClient({ region: "us-east-1" })
  const getHomeChainUrlSecretCommand = new GetSecretValueCommand({
    SecretId: process.env.HOME_CHAIN_NETWORK_URL_SECRET_ARN
  })
  console.log('getting homechain network url secret')
  const homeChainUrlSecret = (await secretsClient.send(getHomeChainUrlSecretCommand)).SecretString;
  if (homeChainUrlSecret === 'DUMMY') {
    console.log('getting global proxy key secret')
    const getGlobalProxyKeyCommand = new GetSecretValueCommand({
      SecretId: process.env.RPC_PROXY_GLOBAL_ACCESS_KEY_ARN
    })
    const globalProxyKeySecret = (await secretsClient.send(getGlobalProxyKeyCommand)).SecretString;

    const setHomechainNetworkUrlSecretCommand = new PutSecretValueCommand({
      SecretId: process.env.HOME_CHAIN_NETWORK_URL_SECRET_ARN,
      SecretString: `${BASE_URL}?key=${globalProxyKeySecret}`,
    })

    console.log('actually setting homechain network url secret')
    await secretsClient.send(setHomechainNetworkUrlSecretCommand);
  }
  console.log('done setting homechain network url secret')
}
  
const getRiverDBAuthToken = async (riverUserDBConfig) => {
  console.log('getting river db auth token')
  const signer = new Signer({
    region: 'us-east-1',
    hostname: riverUserDBConfig.HOST,
    port: riverUserDBConfig.PORT,
    username: LAMBDA_DB_USER,
  })

  const token = await signer.getAuthToken();
  return token;

}

const configureRiverDB = async ({
  token,
  address,
  riverUserDBConfig,
}) => {
  console.log('configuring river db')
  const pgClient = new Client({
    host: riverUserDBConfig.HOST,
    database: riverUserDBConfig.DATABASE,
    password: token,
    user: LAMBDA_DB_USER,
    port: riverUserDBConfig.PORT,
    ssl: {
      rejectUnauthorized: false
    }
  })

  let error;

  try {
    console.log('connecting')
    await pgClient.connect();
    console.log('connected')

    console.log('updating db password')
    // TODO: CREATE USER IF NOT EXISTS
    await pgClient.query(`ALTER USER river WITH PASSWORD '${riverUserDBConfig.PASSWORD}';`)

    console.log('updating schema name')
    const OLD_SCHEMA_NAME = 's0xbf2fe1d28887a0000a1541291c895a26bd7b1ddd'
    const NEW_SCHEMA_NAME = `s${address.toLowerCase()}`
    await pgClient.query(`ALTER SCHEMA ${OLD_SCHEMA_NAME} RENAME TO ${NEW_SCHEMA_NAME};`)
  } catch (e) {
    error = e;
  } finally {
    await pgClient.end()
  }

  if (error) {
    if (error.routine === 'RenameSchema' && error.message.includes('does not exist')) {
      console.log('Rename schema error, ignoring')
    } else {
      console.error('error: ', error)
      throw error;
    }
  }
}

async function findOrCreateRiverUserDBConfig() {
  console.log('finding or creating river user password')
  const RIVER_USER_DB_CONFIG = JSON.parse(process.env.RIVER_USER_DB_CONFIG)
  
  const secretsClient = new SecretsManagerClient({ region: "us-east-1" })
  const command = new GetSecretValueCommand({
    SecretId: RIVER_USER_DB_CONFIG.PASSWORD_ARN
  })
  const secretValue = await secretsClient.send(command);
  let password = secretValue.SecretString;
  if (password === 'DUMMY') {
    console.log('saving new river db password')
    password = generatePostgresPassword();
    const putSecretCommand = new PutSecretValueCommand({
      SecretId: RIVER_USER_DB_CONFIG.PASSWORD_ARN,
      SecretString: password,
    })
    await secretsClient.send(putSecretCommand);
  } else {
    console.log('river db password already set')
  }

  return {
    ...RIVER_USER_DB_CONFIG,
    PASSWORD: password,
  }
}

exports.handler = async (event, context, callback) => {
  try {
    await setHomechainNetworkUrlSecret();
    const privateKey = await getOrSetWalletPrivateKey()
    const wallet = generateFromPrivateKey(privateKey);
    const address = wallet.getAddressString();
    const riverUserDBConfig = await findOrCreateRiverUserDBConfig();
    const token = await getRiverDBAuthToken(riverUserDBConfig);
    await configureRiverDB({
      token,
      address,
      riverUserDBConfig
    });
    callback(null, 'done')
  } catch (e) {
    console.error('error: ', e)
    callback(e)
  }
}