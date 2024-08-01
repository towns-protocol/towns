import {SecretsManagerClient, GetSecretValueCommand, PutSecretValueCommand, ListSecretsCommand, SecretListEntry} from '@aws-sdk/client-secrets-manager'

const copySecretOver = async (fromArn: string, toArn: string) => {
    const client = new SecretsManagerClient({region: 'us-east-1'});
    const getSecretValueCommand = new GetSecretValueCommand({SecretId: fromArn});
    const secret = await client.send(getSecretValueCommand);
    const putSecretValueCommand = new PutSecretValueCommand({SecretId: toArn, SecretString: secret.SecretString});
    await client.send(putSecretValueCommand);
}

type Secret = {
    arn: string,
    name: string
}

const filterSharedSecrets = (secrets: Secret[], params: {
    nodeNumber: number,
    secretKind: "db-password" | "wallet-private-key"
}) => {
    const secretName = `shared-river${params.nodeNumber}-${params.secretKind}`;
    console.log({
        shared: secretName
    })
    return secrets.find(secret => secret.name === secretName);
}

const filterRegularSecrets = (secrets: Secret[], params: {
    nodeNumber: number,
    environment: "gamma" | "omega",
    secretKind: "db-password" | "wallet-private-key"
    nodeKind: "full" | "archive"
}) => {
    const secretName = `${params.environment}-${params.nodeKind}-river${params.nodeNumber}-${params.secretKind}`;
    console.log({
        regular: secretName
    })
    return secrets.find(secret => secret.name === secretName);
}

const getAllSecrets = async () => {
    const client = new SecretsManagerClient({region: 'us-east-1'});
    let listSecretsCommand = new ListSecretsCommand({});
    const secrets: {arn: string, name: string}[] = [];
    let cur = await client.send(listSecretsCommand);

    const onSecret = (secret: SecretListEntry) => {
            secrets.push({
                arn: secret.ARN!,
                name: secret.Name!
            });
    }
    cur.SecretList?.forEach(onSecret);
    while (cur.NextToken) {
        listSecretsCommand = new ListSecretsCommand({NextToken: cur.NextToken});
        cur = await client.send(listSecretsCommand);
        cur.SecretList?.forEach(onSecret);
    }
    return secrets
}

const getPairs = (secrets: Secret[], params: {
    nodeNumber: number,
    environment: "gamma" | "omega",
    nodeKind: "full" | "archive"
}) => {
    const shared = {
        db: filterSharedSecrets(secrets, {nodeNumber: params.nodeNumber, secretKind: 'db-password'}),
        wallet: filterSharedSecrets(secrets, {nodeNumber: params.nodeNumber, secretKind: 'wallet-private-key'})
    };

    const other = {
        db: filterRegularSecrets(secrets, {nodeNumber: params.nodeNumber, environment: params.environment, secretKind: 'db-password', nodeKind: params.nodeKind }),
        wallet: filterRegularSecrets(secrets, {nodeNumber: params.nodeNumber, environment: params.environment, secretKind: 'wallet-private-key', nodeKind: params.nodeKind })
    };

    if (!shared.db) {
        throw new Error('shared db secret not found');
    }
    if (!shared.wallet) {
        throw new Error('shared wallet secret not found');
    }
    if (!other.db) {
        throw new Error('other db secret not found');
    }
    if (!other.wallet) {
        throw new Error('other wallet secret not found');
    }

    return {
        shared: {
            db: shared.db,
            wallet: shared.wallet
        },
        other: {
            db: other.db,
            wallet: other.wallet
        },
    }
}

const copyPairsOver = async (pairs: ReturnType<typeof getPairs>) => {
    await copySecretOver(pairs.shared.db.arn, pairs.other.db.arn);
    await copySecretOver(pairs.shared.wallet.arn, pairs.other.wallet.arn);
}

const run = async () => {
    const allSecrets = await getAllSecrets();

    const gammaFullNodes = Array.from({length: 11 }).map((_, i) => i + 1);

    for (const nodeNumber of gammaFullNodes) {
        const environment = 'gamma';
        const pairs = getPairs(allSecrets, {nodeNumber, environment, nodeKind: 'full'});
        await copyPairsOver(pairs);
    }

    const gammaArchiveNodes = Array.from({length: 1 }).map((_, i) => i + 1);

    for (const nodeNumber of gammaArchiveNodes) {
        const environment = 'gamma';
        const pairs = getPairs(allSecrets, {nodeNumber, environment, nodeKind: 'archive'});
        await copyPairsOver(pairs);
    }

    const omegaArchiveNodes = Array.from({length: 2 }).map((_, i) => i + 1);

    for (const nodeNumber of omegaArchiveNodes) {
        const environment = 'omega';
        const pairs = getPairs(allSecrets, {nodeNumber, environment, nodeKind: 'archive'});
        await copyPairsOver(pairs);
    }
}

run().then(() => console.log('done')).catch(console.error);