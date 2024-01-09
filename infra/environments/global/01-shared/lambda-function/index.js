const {SecretsManagerClient, GetSecretValueCommand, PutSecretValueCommand} = require('@aws-sdk/client-secrets-manager')
const {Signer} = require('@aws-sdk/rds-signer')
const {Client} = require('pg');
const crypto = require('crypto');

const Wallet = require('ethereumjs-wallet');
const EthereumUtil = require('ethereumjs-util');


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
    password.includes('/') ||
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

async function findOrCreateWalletPrivateKey() {
  console.log('getting or setting wallet private key')
  const secretsClient = new SecretsManagerClient({ region: "us-east-1" })
  const getSecretCommand = new GetSecretValueCommand({
    SecretId: process.env.RIVER_NODE_WALLET_CREDENTIALS_ARN
  })
  const secretRaw = await secretsClient.send(getSecretCommand);
  const secretString = secretRaw.SecretString;
  let privateKey;
  if (secretString === 'DUMMY') {
    const wallet = Wallet.default.generate();
    const hexPrivateKey = wallet.getPrivateKeyString();
    privateKey = hexPrivateKey.substring(2);
    const putSecretCommand = new PutSecretValueCommand({
      SecretId: process.env.RIVER_NODE_WALLET_CREDENTIALS_ARN,
      SecretString: privateKey,
    })
    await secretsClient.send(putSecretCommand);
  } else {
    console.log('wallet private key already set')
    privateKey = secretString;
  }

  return privateKey;
}

const getMasterUserCredentials = async () => {
  console.log('getting master user credentials')
  const secretsClient = new SecretsManagerClient({ region: "us-east-1" })

  const getMasterUserCredentials = new GetSecretValueCommand({
    SecretId: process.env.RIVER_DB_CLUSTER_MASTER_USER_SECRET_ARN
  })
  const masterUserCredentialsSecret = (await secretsClient.send(getMasterUserCredentials)).SecretString;

  const masterUserCredentials = JSON.parse(masterUserCredentialsSecret)
  console.log('got master user credentials')
  return masterUserCredentials;
}

const createRiverNodeSchema = async ({
  schemaName,
  riverUserDBConfig
}) => {
  // create schema if not exists
  console.log('creating schema')

  let error;

  const pgClient = new Client({
    host: riverUserDBConfig.HOST,
    database: riverUserDBConfig.DATABASE,
    password: riverUserDBConfig.PASSWORD,
    user: riverUserDBConfig.USER,
    port: riverUserDBConfig.PORT,
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    console.log('connecting')
    await pgClient.connect();
    console.log('connected')

    const createSchemaQuery = `
      DO
      $do$
      BEGIN
        IF NOT EXISTS (
          SELECT FROM pg_catalog.pg_namespace WHERE nspname = '${schemaName}'
        ) THEN
          CREATE SCHEMA ${schemaName};
        END IF;
      END
      $do$
    `;
    await pgClient.query(createSchemaQuery);
    console.log('done creating schema')
  } catch (e) {
    console.error('error creating schema: ', e)
    error = e;
  } finally {
    await pgClient.end()
  }

  if (error) {
    throw error;
  }
}

const createRiverNodeDbUser = async ({
  riverUserDBConfig,
  masterUserCredentials,
}) => {
  console.log('creating river node db user')

  const pgClient = new Client({
    host: riverUserDBConfig.HOST,
    database: 'postgres',
    password: masterUserCredentials.password,
    user: masterUserCredentials.username,
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

    // create user if not exists
    console.log('creating user')

    const createUserQuery = `
      DO
      $do$
      BEGIN
        IF NOT EXISTS (
          SELECT FROM pg_catalog.pg_user WHERE usename = '${riverUserDBConfig.USER}'
        ) THEN
          CREATE USER ${riverUserDBConfig.USER} WITH PASSWORD '${riverUserDBConfig.PASSWORD}';
        END IF;
      END
      $do$
    `;
    await pgClient.query(createUserQuery);
    console.log('created user')

    try {
      console.log('creating database')
      const createDatabaseQuery = `CREATE DATABASE ${riverUserDBConfig.DATABASE};`;
      await pgClient.query(createDatabaseQuery);
      console.log('created database')
    } catch (e) {
      if (e.code == '42P04' || e.code == '23505') {
        console.log('database already exists')
      } else {
        console.error('error creating database: ', e)
        throw e;
      }
    }

    console.log('granting create schema to user')

    await pgClient.query('SELECT pg_advisory_lock(1);'); // 1 is an arbitrary lock ID
    const grantCreateSchemaQuery = `
      GRANT CREATE ON DATABASE ${riverUserDBConfig.DATABASE} TO ${riverUserDBConfig.USER};
    `;

    // run the query above with 5 retry attempts:
    const executeCreateQuery = async () => {
      let attempt = 0;
      let error;
      while (attempt < 5) {
        try {
          await pgClient.query(grantCreateSchemaQuery);
          break;
        } catch (e) {
          console.warn(`error executing create query attempt: ${attempt}`, e)
          error = e;
          attempt++;
        }
      }
      if (error) {
        throw error;
      }
    }

    await executeCreateQuery()

    console.log('done creating user')

  } catch (e) {
    error = e;
  } finally {
    await pgClient.query('SELECT pg_advisory_unlock(1);');
    await pgClient.end()
  }

  if (error) {
    throw error;
  }
}

const createReadOnlyDbUser = async ({
  riverReadOnlyUserDBConfig,
  masterUserCredentials,
  schemaName,
}) => {
  console.log('creating river node Read only db user')

  const pgClient = new Client({
    host: riverReadOnlyUserDBConfig.HOST,
    database: riverReadOnlyUserDBConfig.DATABASE,
    password: masterUserCredentials.password,
    user: masterUserCredentials.username,
    port: riverReadOnlyUserDBConfig.PORT,
    ssl: {
      rejectUnauthorized: false
    }
  })

  let error;

  try {
    console.log('connecting')
    await pgClient.connect();
    console.log('connected')

    // create user if not exists
    console.log('creating readonly user')

    const createUserQuery = `
      DO
      $do$
      BEGIN
        IF NOT EXISTS (
          SELECT FROM pg_catalog.pg_user WHERE usename = '${riverReadOnlyUserDBConfig.USER}'
        ) THEN
          CREATE USER "${riverReadOnlyUserDBConfig.USER}" WITH PASSWORD '${riverReadOnlyUserDBConfig.PASSWORD}';
        END IF;
      END
      $do$
    `;
    await pgClient.query(createUserQuery);
    console.log('created read only user')

    await pgClient.query('SELECT pg_advisory_lock(1);'); // 1 is an arbitrary lock ID
    const grantReadPermissionQuery = `
      GRANT CONNECT ON DATABASE ${riverReadOnlyUserDBConfig.DATABASE} TO "${riverReadOnlyUserDBConfig.USER}";
      GRANT USAGE ON SCHEMA public TO "${riverReadOnlyUserDBConfig.USER}";
      GRANT SELECT ON ALL TABLES IN SCHEMA public TO "${riverReadOnlyUserDBConfig.USER}";
      GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO "${riverReadOnlyUserDBConfig.USER}";
      GRANT USAGE ON SCHEMA ${schemaName} TO "${riverReadOnlyUserDBConfig.USER}";
      GRANT SELECT ON ALL TABLES IN SCHEMA ${schemaName} TO "${riverReadOnlyUserDBConfig.USER}";
      GRANT SELECT ON ALL SEQUENCES IN SCHEMA ${schemaName} TO "${riverReadOnlyUserDBConfig.USER}";
    `;

    // run the query above with 5 retry attempts:
    const executeCreateQuery = async () => {
      let attempt = 0;
      let error;
      while (attempt < 5) {
        try {
          await pgClient.query(grantReadPermissionQuery);
          break;
        } catch (e) {
          console.warn(`error executing create query attempt: ${attempt}`, e)
          error = e;
          attempt++;
        }
      }
      if (error) {
        throw error;
      }
    }

    await executeCreateQuery()

    console.log('done creating readonly user')

  } catch (e) {
    error = e;
  } finally {
    await pgClient.query('SELECT pg_advisory_unlock(1);');
    await pgClient.end()
  }

  if (error) {
    throw error;
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

async function findOrCreateRiverReadOnlyUserDBConfig() {
  console.log('finding or creating river read only user password')
  const RIVER_READ_ONLY_USER_DB_CONFIG = JSON.parse(process.env.RIVER_READ_ONLY_USER_DB_CONFIG)

  const secretsClient = new SecretsManagerClient({ region: "us-east-1" })
  const command = new GetSecretValueCommand({
    SecretId: RIVER_READ_ONLY_USER_DB_CONFIG.PASSWORD_ARN
  })
  const secretValue = await secretsClient.send(command);
  let password = secretValue.SecretString;
  if (password === 'DUMMY') {
    console.log('saving new river read only db password')
    password = generatePostgresPassword();
    const putSecretCommand = new PutSecretValueCommand({
      SecretId: RIVER_READ_ONLY_USER_DB_CONFIG.PASSWORD_ARN,
      SecretString: password,
    })
    await secretsClient.send(putSecretCommand);
  } else {
    console.log('river read only db password already set')
  }

  return {
    ...RIVER_READ_ONLY_USER_DB_CONFIG,
    PASSWORD: password,
  }
}

exports.handler = async (event, context, callback) => {
  try {
    // find or create the wallet private key, and use it to configure the db schema
    const privateKey = await findOrCreateWalletPrivateKey()
    const wallet = generateFromPrivateKey(privateKey);
    const address = wallet.getAddressString();

    const riverUserDBConfig = await findOrCreateRiverUserDBConfig();
    const masterUserCredentials = await getMasterUserCredentials();
    const riverReadOnlyUserDBConfig = await findOrCreateRiverReadOnlyUserDBConfig();

    console.log('node wallet address: ', address)

    await createRiverNodeDbUser({
      address,
      riverUserDBConfig,
      masterUserCredentials,
    });

    const schemaName = `s${address.toLowerCase()}`
    // need to create the schema before creating the read only user,
    // because the read only user needs to maintain read access to the schema
    await createRiverNodeSchema({
      schemaName,
      riverUserDBConfig,
    });

    await createReadOnlyDbUser({
      schemaName,
      riverReadOnlyUserDBConfig,
      masterUserCredentials,
    });

    callback(null, 'done')
  } catch (e) {
    console.error('error: ', e)
    callback(e)
  }
}
