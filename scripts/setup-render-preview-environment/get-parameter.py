import argparse
import boto3
from botocore.exceptions import ClientError

def get_parameter(name):
    """
    Retrieve a parameter from AWS SSM Parameter Store.
    
    Parameters:
    - name: str, the name of the parameter

    Returns:
    - The value of the parameter if successful, None otherwise.
    """
    # Create a session using your current creds and region
    session = boto3.Session()
    
    # Create an SSM client
    ssm_client = session.client('ssm')
    
    try:
        # Get the parameter
        response = ssm_client.get_parameter(
            Name=name,
            WithDecryption=True  # Set to True if the parameter is encrypted
        )
        # Extract the parameter value
        return response['Parameter']['Value']
    except ClientError as e:
        print(f"An error occurred: {e}")
        return None

def main():
    # Create the parser
    parser = argparse.ArgumentParser(description='Retrieve a parameter from AWS SSM Parameter Store.')
    
    # Add the arguments
    parser.add_argument('ParameterName',
                        metavar='parameter_name',
                        type=str,
                        help='the name of the parameter to retrieve')

    # Execute the parse_args() method
    args = parser.parse_args()

    # Use the parameter name from the command line
    value = get_parameter(args.ParameterName)
    if value is not None:
        print(f"{value}")
    else:
        print("Failed to retrieve the parameter value.")
        exit(1)

if __name__ == '__main__':
    main()
