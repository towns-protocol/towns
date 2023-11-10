## Datadog changes

Once you acquire your datadog api key and app key, make sure you export them to your shell via:

```
export TF_VAR_datadog_api_key="XXXXXXXXXXXXXXXXX"
export TF_VAR_datadog_app_key="XXXXXXXXXXXXXXXXX"
export TF_VAR_cloudflare_terraform_api_token="XXXXXXXXXXXX"
```

`terraform apply` will automatically resolve these for you.

## Usage via Make command
### Prerequisite package
- docker
- make

Pass the AWS Profile as an environment variable to terraform as below

    export AWS_PROFILE=harmony-github-actions

- Initialization of terraform

        cd harmony/infra
        make init

- Planning the infra changes

        make plan

- Applying the infra changes

        make apply

Without passing any argument to make command, default environment is test. To override the environment run below command

        make init ENV=<environment>
        make plan ENV=<environment>
        make apply ENV=<environment>
