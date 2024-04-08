output "test" {
  value = try(datadog_synthetics_test.main[0], "")
}
