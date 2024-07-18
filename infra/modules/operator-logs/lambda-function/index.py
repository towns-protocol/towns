import boto3
import requests
import os
import json

def datadog_forwarder(event, context):
    # S3 bucket and file details
    # bucket_name = os.environ['BUCKET_NAME']
    # file_key = os.environ['FILE_KEY']

    print("Received event: " + json.dumps(event, indent=2))
    for record in event['Records']:
        bucket_name = record['s3']['bucket']['name']
        file_key = record['s3']['object']['key']
        print(f"New object created in bucket {bucket_name}: {file_key}")

        env = os.environ['ENVIRONMENT']
        # Secrets Manager details
        secret_name = os.environ['DATADOG_SECRET_NAME']

        # Create a Secrets Manager client
        secrets_client = boto3.client('secretsmanager')

        # Get the Datadog API key from Secrets Manager
        response = secrets_client.get_secret_value(SecretId=secret_name)
        datadog_api_key = response['SecretString']

        # Create an S3 client
        s3_client = boto3.client('s3')

        # Read the file from S3
        try:
            response = s3_client.get_object(Bucket=bucket_name, Key=file_key)
            file_content = response['Body'].read().decode('utf-8')
        except Exception as e:
            print(f"Error reading S3 file: {e}")
            raise e

        # Send the file content to Datadog
        try:
            datadog_url = "https://http-intake.logs.datadoghq.com/v1/input"
            headers = {
                "Content-Type": "text/plain",
                "DD-API-KEY": datadog_api_key
            }
            payload = {
                "message": file_content,
                "ddtags":  "environment:"+env+",run_type:lambda",
                "service": "figment-logs",
                "hostname": file_key
            }
            response = requests.post(datadog_url, headers=headers, json=payload)
            response.raise_for_status()
            print(f"File content sent to Datadog successfully")
        except Exception as e:
            print(f"Error sending data to Datadog: {e}")
            raise e

    return {
        'statusCode': 200,
        'body': 'Event processed successfully'
    }
