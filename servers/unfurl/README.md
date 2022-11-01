# Zion Unfurler

Requirements:

Node 16.17.1 - this is locked at Node 16 because Lambda only supports Node 16.x

[serverless cli](https://www.serverless.com/framework/docs/getting-started)

[AWS credentials](https://www.serverless.com/framework/docs/providers/aws/guide/credentials/) (for deployment)

Copy `env.json-sample` to `env.json` and add twitter bearer token located TBD

```
export AWS_ACCESS_KEY_ID=<your-key-here>
export AWS_SECRET_ACCESS_KEY=<your-secret-key-here>
# AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are now available for serverless to use

```

For development: `yarn dev`. The server will be available at `localhost:3666`. You can pass it a url with encoded `urls` query param:

```
 const urls = encodeURIComponent(JSON.stringify(["example.com"]))
 localhost:3666?urls=${urls}

 localhost:3666?urls=%5B%22https%3A%2F%2Ftwitter.com%2Felonmusk%2Fstatus%2F1587129795732770824%2Chttps%3A%2F%2Ftwitter.com%2Felonmusk%2Fstatus%2F1587129795732770824%22%5D

```

For testing locally:
`serverless invoke local --function unfurl -p ./handlers/unfurl/cliData.json`

Deployment (After adding AWS creds like above):
`serverless deploy`
