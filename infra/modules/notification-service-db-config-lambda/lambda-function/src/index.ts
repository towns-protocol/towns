import {
    SecretsManagerClient,
    GetSecretValueCommand,
    PutSecretValueCommand,
} from '@aws-sdk/client-secrets-manager'
import { Client, DatabaseError } from 'pg'
import crypto from 'crypto'
import type { Handler } from 'aws-lambda'
import { z } from 'zod'

// Take a string and return a number if the string is a valid integer
const intStringSchema = z
    .string()
    .refine((v) => /^\d+$/.test(v))
    .transform(Number)

// Take a string and parse it as a JSON object, then validate the object to have a username and password
const masterDbUserConfigObjectSchema = z
    .string()
    .transform((v) => JSON.parse(v))
    .pipe(
        z.object({
            username: z.string(),
            password: z.string(),
        }),
    )

// Take a string and parse it as a JSON object, then validate the object to have HOST, DATABASE, PASSWORD_ARN, USER, and PORT
const dbUserConfigWithSecretArnSchema = z
    .string()
    .transform((v) => JSON.parse(v))
    .pipe(
        z.object({
            HOST: z.string(),
            DATABASE: z.string(),
            PASSWORD_ARN: z.string(),
            USER: z.string(),
            PORT: intStringSchema,
        }),
    )

type DbUserConfigWithSecretARN = z.infer<typeof dbUserConfigWithSecretArnSchema>

const envSchema = z.object({
    DB_CLUSTER_MASTER_USER_SECRET_ARN: z.string(),
    NOTIFICATION_SERVICE_USER_DB_CONFIG: dbUserConfigWithSecretArnSchema,
    RIVER_READ_ONLY_USER_DB_CONFIG: dbUserConfigWithSecretArnSchema,
})

const env = envSchema.parse(process.env)

type DBConfig = {
    host: string
    database: string
    password: string
    user: string
    port: number
}

function generatePassword(length = 12) {
    return crypto.randomBytes(length).toString('base64').slice(0, length)
}

function isDBAlreadyExistsError(e: unknown) {
    return e instanceof DatabaseError && (e.code == '42P04' || e.code == '23505')
}

function generatePostgresPassword() {
    const PG_PASSWORD_LENGTH = 32
    let password = generatePassword(PG_PASSWORD_LENGTH)
    while (
        password.includes("'") ||
        password.includes('"') ||
        password.includes('\\') ||
        password.includes('/') ||
        password.includes(';')
    ) {
        console.log('regenerating password')
        password = generatePassword(PG_PASSWORD_LENGTH)
    }
    console.log('generated password.')
    return password
}

const getMasterUserCredentials = async () => {
    console.log('getting master user credentials')
    const secretsClient = new SecretsManagerClient({ region: 'us-east-1' })

    const getMasterUserCredentials = new GetSecretValueCommand({
        SecretId: env.DB_CLUSTER_MASTER_USER_SECRET_ARN,
    })
    const masterUserCredentialsSecret = (await secretsClient.send(getMasterUserCredentials))
        .SecretString
    if (!masterUserCredentialsSecret) {
        throw new Error('master user credentials not found')
    }

    const masterUserCredentials = masterDbUserConfigObjectSchema.parse(masterUserCredentialsSecret)
    return masterUserCredentials
}

const createSchema = async ({
    schemaName,
    dbConfig,
}: {
    schemaName: string
    dbConfig: DBConfig
}) => {
    // create schema if not exists
    console.log('creating schema')

    let error

    const pgClient = new Client({
        host: dbConfig.host,
        database: dbConfig.database,
        password: dbConfig.password,
        user: dbConfig.user,
        port: dbConfig.port,
        ssl: {
            rejectUnauthorized: false,
        },
    })

    try {
        console.log('connecting')
        await pgClient.connect()
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
    `
        await pgClient.query(createSchemaQuery)
        console.log('done creating schema')
    } catch (e) {
        console.error('error creating schema: ', e)
        error = e
    } finally {
        await pgClient.end()
    }

    if (error) {
        throw error
    }
}

const createNotificationServiceDbUser = async ({
    notificationServiceUserDbConfig,
    masterUserCredentials,
}: {
    notificationServiceUserDbConfig: DBConfig
    masterUserCredentials: { username: string; password: string }
}) => {
    console.log('creating notification service db user')

    const pgClient = new Client({
        host: notificationServiceUserDbConfig.host,
        database: 'postgres',
        password: masterUserCredentials.password,
        user: masterUserCredentials.username,
        port: notificationServiceUserDbConfig.port,
        ssl: {
            rejectUnauthorized: false,
        },
    })

    let error

    try {
        console.log('connecting')
        await pgClient.connect()
        console.log('connected')

        // create user if not exists
        console.log('creating user')

        const createUserQuery = `
      DO
      $do$
      BEGIN
        IF NOT EXISTS (
          SELECT FROM pg_catalog.pg_user WHERE usename = '${notificationServiceUserDbConfig.user}'
        ) THEN
          CREATE USER ${notificationServiceUserDbConfig.user} WITH PASSWORD '${notificationServiceUserDbConfig.password}';
        END IF;
      END
      $do$
    `

        await pgClient.query(createUserQuery)
        console.log('created user')

        try {
            console.log('creating database')
            const createDatabaseQuery = `CREATE DATABASE ${notificationServiceUserDbConfig.database};`
            await pgClient.query(createDatabaseQuery)
            console.log('created database')
        } catch (e) {
            if (isDBAlreadyExistsError(e)) {
                console.log('database already exists')
            } else {
                console.error('error creating database: ', e)
                throw e
            }
        }

        console.log('granting create schema to user')

        await pgClient.query('SELECT pg_advisory_lock(1);') // 1 is an arbitrary lock ID
        const grantCreateSchemaQuery = `
      GRANT CREATE ON DATABASE ${notificationServiceUserDbConfig.database} TO ${notificationServiceUserDbConfig.user};
    `

        // run the query above with 5 retry attempts:
        const executeCreateQuery = async () => {
            let attempt = 0
            let error
            while (attempt < 5) {
                try {
                    await pgClient.query(grantCreateSchemaQuery)
                    break
                } catch (e) {
                    console.warn(`error executing create query attempt: ${attempt}`, e)
                    error = e
                    attempt++
                }
            }
            if (error) {
                throw error
            }
        }

        await executeCreateQuery()

        console.log('done creating user')
    } catch (e) {
        error = e
    } finally {
        await pgClient.query('SELECT pg_advisory_unlock(1);')
        await pgClient.end()
    }

    if (error) {
        throw error
    }
}

const createReadOnlyDbUser = async ({
    riverReadOnlyUserDBConfig,
    masterUserCredentials,
    schemaName,
}: {
    riverReadOnlyUserDBConfig: DBConfig
    masterUserCredentials: { username: string; password: string }
    schemaName: string
}) => {
    console.log('creating river node Read only db user')

    const pgClient = new Client({
        host: riverReadOnlyUserDBConfig.host,
        database: riverReadOnlyUserDBConfig.database,
        password: masterUserCredentials.password,
        user: masterUserCredentials.username,
        port: riverReadOnlyUserDBConfig.port,
        ssl: {
            rejectUnauthorized: false,
        },
    })

    let error

    try {
        console.log('connecting')
        await pgClient.connect()
        console.log('connected')

        // create user if not exists
        console.log('creating readonly user')

        const createUserQuery = `
      DO
      $do$
      BEGIN
        IF NOT EXISTS (
          SELECT FROM pg_catalog.pg_user WHERE usename = '${riverReadOnlyUserDBConfig.user}'
        ) THEN
          CREATE USER "${riverReadOnlyUserDBConfig.user}" WITH PASSWORD '${riverReadOnlyUserDBConfig.password}';
        END IF;
      END
      $do$
    `
        await pgClient.query(createUserQuery)
        console.log('created read only user')

        await pgClient.query('SELECT pg_advisory_lock(1);') // 1 is an arbitrary lock ID

        const grantReadPermissionQuery = `
      GRANT CONNECT ON DATABASE ${riverReadOnlyUserDBConfig.database} TO "${riverReadOnlyUserDBConfig.user}";
      GRANT USAGE ON SCHEMA public TO "${riverReadOnlyUserDBConfig.user}";
      GRANT SELECT ON ALL TABLES IN SCHEMA public TO "${riverReadOnlyUserDBConfig.user}";
      GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO "${riverReadOnlyUserDBConfig.user}";
      GRANT USAGE ON SCHEMA ${schemaName} TO "${riverReadOnlyUserDBConfig.user}";
      GRANT SELECT ON ALL TABLES IN SCHEMA ${schemaName} TO "${riverReadOnlyUserDBConfig.user}";
      GRANT SELECT ON ALL SEQUENCES IN SCHEMA ${schemaName} TO "${riverReadOnlyUserDBConfig.user}";
    `

        // run the query above with 5 retry attempts:
        const executeCreateQuery = async () => {
            let attempt = 0
            let error
            while (attempt < 5) {
                try {
                    await pgClient.query(grantReadPermissionQuery)
                    break
                } catch (e) {
                    console.warn(`error executing create query attempt: ${attempt}`, e)
                    error = e
                    attempt++
                }
            }
            if (error) {
                throw error
            }
        }

        await executeCreateQuery()

        console.log('done creating readonly user')
    } catch (e) {
        error = e
    } finally {
        await pgClient.query('SELECT pg_advisory_unlock(1);')
        await pgClient.end()
    }

    if (error) {
        throw error
    }
}

async function findOrCreateDBUser(config: DbUserConfigWithSecretARN): Promise<DBConfig> {
    console.log('finding or creating db user password')

    const secretsClient = new SecretsManagerClient({ region: 'us-east-1' })
    const command = new GetSecretValueCommand({
        SecretId: config.PASSWORD_ARN,
    })
    const secretValue = await secretsClient.send(command)
    let password = secretValue.SecretString
    if (typeof password !== 'string') {
        throw new Error('db user password not found')
    }
    if (password === 'DUMMY') {
        console.log('saving new db password')
        password = generatePostgresPassword()
        const putSecretCommand = new PutSecretValueCommand({
            SecretId: config.PASSWORD_ARN,
            SecretString: password,
        })
        await secretsClient.send(putSecretCommand)
    }

    return {
        host: config.HOST,
        database: config.DATABASE,
        user: config.USER,
        port: config.PORT,
        password,
    }
}

export const handler: Handler = async (event, context, callback) => {
    try {
        // find or create the wallet private key, and use it to configure the db schema

        const masterUserCredentials = await getMasterUserCredentials()
        const riverReadOnlyUserDBConfig = await findOrCreateDBUser(
            env.RIVER_READ_ONLY_USER_DB_CONFIG,
        )
        const notificationServiceUserDbConfig = await findOrCreateDBUser(
            env.NOTIFICATION_SERVICE_USER_DB_CONFIG,
        )

        await createNotificationServiceDbUser({
            notificationServiceUserDbConfig,
            masterUserCredentials,
        })

        await createSchema({
            schemaName: 'notification_service',
            dbConfig: notificationServiceUserDbConfig,
        })

        await createReadOnlyDbUser({
            schemaName: 'notification_service',
            riverReadOnlyUserDBConfig,
            masterUserCredentials,
        })

        callback(null, 'done')
    } catch (e) {
        console.error('error: ', e)
        if (e instanceof Error) {
            callback(e)
        } else {
            callback(new Error('unknown error'))
        }
    }
}
