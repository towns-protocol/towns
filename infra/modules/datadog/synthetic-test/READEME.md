# Usage
```hcl
module "datadog_sythetics_test" {
  source = "../../modules/datadog/synthetic-test"
  name      = "Terraform(river1 - gamma - 1min - 1 location)"
  type      = "api"
  subtype   = "http"
  locations = ["aws:us-west-1"]
  tags      = ["created_by:terraform", "env:${terraform.workspace}"]

  request_definition = {
    method = "GET"
    url    = "https://river1.nodes.gamma.towns.com/info"
  }
  assertions = [
        {
          type     = "responseTime"
          operator = "lessThan"
          target   = "3000"
        },
        {
          type     = "statusCode"
          operator = "is"
          target   = "200"
        },
        {
          type     = "header"
          property = "content-type"
          operator = "is"
          target   = "text/html"
        }
  ]

  options_list = {
    tick_every = 60
    retry = {
      count    = 0
      interval = 300
    }
    monitor_options = {
      renotify_interval = 30  #Min
    }
    min_failure_duration = 60 #Sec
    min_location_failed = 1

  }
}
```
