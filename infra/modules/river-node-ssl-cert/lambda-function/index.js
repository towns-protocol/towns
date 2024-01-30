const {
    SecretsManagerClient, 
    GetSecretValueCommand, 
    PutSecretValueCommand
} = require('@aws-sdk/client-secrets-manager')

function getConfigFromEnv() {
    const {
        RIVER_NODE_SSL_CERT_SECRET_ARN
    } = process.env;
    if (!RIVER_NODE_SSL_CERT_SECRET_ARN || RIVER_NODE_SSL_CERT_SECRET_ARN === '') {
        throw new Error('RIVER_NODE_SSL_CERT_SECRET_ARN is not defined');
    }

    return {
        RIVER_NODE_SSL_CERT_SECRET_ARN
    }
}

// returns a json object with 2 keys: key and crt
// example: {key: "DUMMY", crt: "DUMMY"}
// these values represent base64 encoded strings:
// key: the private key
// crt: the certificate
async function getSSLCertFromSecretsManager(secretArn) {
    const client = new SecretsManagerClient({ region: 'us-east-1' });
    const command = new GetSecretValueCommand({ SecretId: secretArn });
    const response = await client.send(command);
    const keyAndCrt = JSON.parse(response.SecretString);

    return keyAndCrt;
}

exports.handler = async (event, context, callback) => {
    const config = getConfigFromEnv();
    const currentKeyAndCrt = await getSSLCertFromSecretsManager(config.RIVER_NODE_SSL_CERT_SECRET_ARN);
    // TODO: logging this for now, just for initial debugging purposes.
    console.log('currentKeyAndCrt', currentKeyAndCrt);
};