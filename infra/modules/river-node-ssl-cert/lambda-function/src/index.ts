import { APIGatewayProxyEvent, APIGatewayProxyResult, Context, Handler } from 'aws-lambda';
import * as acme from 'acme-client';
import { SecretsManager } from '@aws-sdk/client-secrets-manager';
import Cloudflare, { DnsRecordWithoutPriority } from 'cloudflare';
import { X509Certificate } from 'crypto';

const commonName = process.env.COMMON_NAME as string;
const challengeDnsRecordFQName = process.env.CHALLENGE_DNS_RECORD_FQ_NAME as string;
const cloudflareZoneId = 'c69eaa5bc5b4d85a7055d70bcc2d038a';
const ssl_cert = process.env.RIVER_NODE_SSL_CERT_ARN;
const acme_account = process.env.RIVER_NODE_ACME_ACCOUNT_ARN;
const cloudflare_token_secret = process.env.CLOUDFLARE_API_TOKEN_ARN;


// Handler function for Lambda
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handler: Handler = async (_event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    try {
        console.log('Processing certificate renewal', context.awsRequestId  );
        console.log('Secret Name ssl_cert:', ssl_cert);
        console.log('Secret Name acme_account:', acme_account);

        const accountKey = await getOrCreateAccountKey()

        acme.setLogger((message) => {
            //console.log(`acme log: ${message}`);
        });
        // Initialize ACME client
        const client = new acme.Client({
            directoryUrl: acme.directory.letsencrypt.production,
            accountKey ,
        });

        await client.createAccount({
            termsOfServiceAgreed: true,
            contact: ['mailto:brian@hntlabs.com'],
        });

        // Prepare for certificate request
        const [key, csr] = await acme.crypto.createCsr({
            commonName: commonName,
        });

        // Create ACME order
        let order = await client.createOrder({
            identifiers: [{ type: 'dns', value: commonName }],
        });

        // Handle ACME challenges
        const authorizations = await client.getAuthorizations(order);
        for (const auth of authorizations) {
            console.log('Authorization:', auth);
            let challenge = auth.challenges.find((c) => c.type === 'dns-01');
            if (!challenge) {
                throw new Error('No DNS challenge found');
            }
            const dnsRecordValue = await client.getChallengeKeyAuthorization(challenge);

            const dnsRecord: DnsRecordWithoutPriority = {
                type: 'TXT',
                name: challengeDnsRecordFQName,
                content: dnsRecordValue,
                ttl: 120, // TTL in seconds,
            };
            console.log('DNS record:', dnsRecord);
            // Update Cloudflare DNS
            await updateCloudflareDNS(dnsRecord);

            // Notify ACME server that challenge is ready
            await client.verifyChallenge(auth, challenge);
            console.log('Challenge verified:', challenge);
            // Inform the ACME server that the challenge response is ready
            challenge = await client.completeChallenge(challenge);
            console.log('Challenge completed:', challenge);
            challenge = await client.waitForValidStatus(challenge);
            console.log('Challenge completed and valid:', challenge);
        }

        console.log('All challenges completed', order);
        const url = order.url;

        order = await client.waitForValidStatus(order);

        console.log('Order status:', order);

        // Once the order is ready, you can proceed to finalize it
        if (order.status === 'ready') {
            // Finalize the order
            order = await client.finalizeOrder(order, csr); // 'csr' is your certificate signing request
        } else {
            throw new Error(`Order not ready for finalization: ${order.status}`);
        }

        console.log('Order finalized:', order);
        // Wait for the order to change from 'processing' to 'valid'
        while (order.status === 'processing') {
            console.log('Order is still processing, waiting...');
            await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for 5 seconds
            // See if this helps
            order.url = url;
            order = await client.getOrder(order);
            console.log('Checked order status:', order);
        }

        // Ensure the order is 'valid' before attempting to get the certificate
        if (order.status === 'valid') {
            const certificate = await client.getCertificate(order);
            console.log('Certificate obtained:', certificate);
            // Further processing...
        } else {
            throw new Error('Order did not reach valid status. Current status: ' + order.status);
        }
        // Get the certificate
        const certificate = await client.getCertificate(order);
        if (!certificate) {
            throw new Error('Certificate could not be obtained');
        }

        console.log('Certificate obtained', certificate.length);
        // Validate certificate chain
        validateCertificateChain(certificate);

        // Store certificate in AWS Secrets Manager
        await storeCertificateInSecretManager(certificate, key);
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'certificate updated successfully',
            }),
        };
    } catch (error) {
        console.error('Error processing certificate renewal:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'some error happened',
                error,
            }),
        };

        // Handle error appropriately
    } finally {
        await cleanupCloudflareDNS();
    }
};

function parseCertificateChain(chain: string) {
    // Normalize line endings to Unix-style just in case
    chain = chain.replace(/\r\n/g, '\n');

    // Split the chain into individual certificates
    return chain
        .trim()
        .split('-----END CERTIFICATE-----\n')
        .filter(cert => cert.trim())  // Remove any empty strings resulting from the split
        .map(cert => cert.trim() + '\n-----END CERTIFICATE-----'); // Add the END marker back to each cert
}


function validateCertificateChain(chain: string) {
    const certificates = parseCertificateChain(chain);

    certificates.forEach((certPem) => {
        console.log('Validating certificate:', certPem);
        const cert = new X509Certificate(certPem);

        // Perform your validation checks here
        // For example, check validity period
        if (cert.validFrom && cert.validTo) {
            const validFrom = new Date(cert.validFrom);
            const validTo = new Date(cert.validTo);
            const now = new Date();

            if (now < validFrom || now > validTo) {
                throw new Error('Certificate is either not yet valid or has expired');
            }
        }
    });
}

async function updateCloudflareDNS(dnsRecord: DnsRecordWithoutPriority) {

    try {
        const secretsManager = new SecretsManager({ region: 'us-east-1' });
    
        const cloudflare_token = await secretsManager.getSecretValue({ SecretId: cloudflare_token_secret });
    
        const cf = new Cloudflare({ token: cloudflare_token?.SecretString });
        const response = await cf.dnsRecords.add(cloudflareZoneId, dnsRecord);
        console.log('DNS record added:', response);
        return response;
    } catch (error) {
        console.error('Error updating Cloudflare DNS:', error);
        throw error;
    }
}

async function cleanupCloudflareDNS() {
    try {
        const secretsManager = new SecretsManager({ region: 'us-east-1' });
    
        const cloudflare_token = await secretsManager.getSecretValue({ SecretId: cloudflare_token_secret });
        const cf = new Cloudflare({ token: cloudflare_token?.SecretString });

        // First, list all DNS records to find the ID of the TXT record
        const records = await cf.dnsRecords.browse(cloudflareZoneId, {type: 'TXT', name: challengeDnsRecordFQName});
        const txtRecord = records.result?.find((record) => record.name === challengeDnsRecordFQName);

        console.log('TXT record:', txtRecord, records.result?.map((record) => record.name));
        if (!txtRecord) {
            throw new Error('TXT record not found');
        }

        // Then, delete the TXT record using its ID
        const response = await cf.dnsRecords.del(cloudflareZoneId, txtRecord.id);
        console.log('TXT record removed:', response);
        return response;
    } catch (error) {
        console.error('Error removing TXT record:', error);
    }
}
async function getOrCreateAccountKey(): Promise<Buffer> {
    const secretsManager = new SecretsManager({ region: 'us-east-1' });
    console.log('Getting or creating account key', acme_account);

    try {
        // Try to retrieve the existing account key
        const existingSecret = await secretsManager.getSecretValue({ SecretId: acme_account });
        if (existingSecret && existingSecret.SecretString) {
            const privateKeyBuffer = Buffer.from(existingSecret.SecretString, 'base64');

            return privateKeyBuffer;
        }
    } catch (error) {
        console.log('Account key not found in Secrets Manager, creating a new one:', error);
        // If the secret doesn't exist, we'll create a new one
    }

    // Create a new private key for the ACME account
    const accountKeyBuffer = await acme.crypto.createPrivateKey();
    const accountKeyString = accountKeyBuffer.toString('base64'); // Convert Buffer to a base64 encoded string

    // Store the new key in AWS Secrets Manager
    await secretsManager.putSecretValue({
        SecretId: acme_account,
        SecretString: accountKeyString,
    });

    console.log('Account key created and stored in Secrets Manager', accountKeyString);
    return accountKeyBuffer;
}
async function storeCertificateInSecretManager(cert: string, privateKey: Buffer) {
    const secretsManager = new SecretsManager({ region: 'us-east-1' });

    // Store the certificate in AWS Secrets Manager
    await secretsManager.putSecretValue({
        SecretId: ssl_cert,
        SecretString: JSON.stringify({ cert, privateKey }),
    });
}

