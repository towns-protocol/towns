## Datadog changes

Once you acquire your datadog api key and app key, make sure you export them to your shell via:

```
export TF_VAR_datadog_api_key="XXXXXXXXXXXXXXXXX"
export TF_VAR_datadog_app_key="XXXXXXXXXXXXXXXXX"
```

`terraform apply` will automatically resolve these for you.