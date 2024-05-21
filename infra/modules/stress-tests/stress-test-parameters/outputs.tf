output "stress_test_session_id_parameter" {
  value = aws_ssm_parameter.stress_test_session_id_parameter
}

output "stress_test_container_count_parameter" {
  value = aws_ssm_parameter.stress_test_container_count_parameter
}

output "stress_test_processes_per_container_parameter" {
  value = aws_ssm_parameter.stress_test_processes_per_container_parameter
}

output "stress_test_clients_count_parameter" {
  value = aws_ssm_parameter.stress_test_clients_count_parameter
}

output "stress_test_stress_duration_parameter" {
  value = aws_ssm_parameter.stress_test_stress_duration_parameter
}

output "river_system_parameters_policy" {
  value = aws_iam_policy.river_system_parameters_policy
}
