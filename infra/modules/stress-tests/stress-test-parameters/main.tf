module "global_constants" {
  source = "../../global-constants"
}

resource "aws_ssm_parameter" "stress_test_session_id_parameter" {
  name  = "stress-test-session-id-${terraform.workspace}"
  type  = "String"
  value = "NULL"

  lifecycle {
    ignore_changes = [value]
  }

  tags = module.global_constants.tags
}

resource "aws_ssm_parameter" "stress_test_container_count_parameter" {
  name  = "stress-test-container-count-${terraform.workspace}"
  type  = "String"
  value = "NULL"

  lifecycle {
    ignore_changes = [value]
  }

  tags = module.global_constants.tags
}

resource "aws_ssm_parameter" "stress_test_processes_per_container_parameter" {
  name  = "stress-test-processes-per-container-${terraform.workspace}"
  type  = "String"
  value = "NULL"

  lifecycle {
    ignore_changes = [value]
  }

  tags = module.global_constants.tags
}

resource "aws_ssm_parameter" "stress_test_clients_count_parameter" {
  name  = "stress-test-clients-count-${terraform.workspace}"
  type  = "String"
  value = "NULL"

  lifecycle {
    ignore_changes = [value]
  }

  tags = module.global_constants.tags
}


resource "aws_ssm_parameter" "stress_test_stress_duration_parameter" {
  name  = "stress-test-stress-duration-${terraform.workspace}"
  type  = "String"
  value = "NULL"

  lifecycle {
    ignore_changes = [value]
  }

  tags = module.global_constants.tags
}

# Creat an IAM policy that allows the attached entity to read the SSM parameters

resource "aws_iam_policy" "river_system_parameters_policy" {
  name        = "stress-test-system-parameters-policy-${terraform.workspace}"
  description = "Policy for reading River system parameters"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath",
        ]
        Resource = [
          aws_ssm_parameter.stress_test_session_id_parameter.arn,
          aws_ssm_parameter.stress_test_container_count_parameter.arn,
          aws_ssm_parameter.stress_test_processes_per_container_parameter.arn,
          aws_ssm_parameter.stress_test_clients_count_parameter.arn,
          aws_ssm_parameter.stress_test_stress_duration_parameter.arn
        ]
      },
    ]
  })

  tags = module.global_constants.tags
}
