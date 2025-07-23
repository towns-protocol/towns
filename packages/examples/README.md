# Towns Protocol Examples

This directory contains example implementations to help you get started with building on the Towns Protocol.

## Getting Started

1. Browse the available example directories to find one that matches your needs
2. Navigate to the specific example directory
3. Copy `.env.sample` to `.env` and fill in your credentials
4. Install dependencies: `yarn install`
5. Run the example: `yarn dev`

## Environment Variables

Most examples require these core environment variables:

- `APP_PRIVATE_DATA_BASE64`: Your Towns app private data
- `JWT_SECRET`: JWT secret for authentication
- `RIVER_ENV`: Environment (local_multi/alpha/omega)
- `PORT`: Port to run the application on

**Important**: Always check the `.env.sample` file in each example directory to see the complete list of required environment variables, as different examples may need additional configuration (like API keys for external services).

## Development Tips

- Each example runs on its own port - make sure to use different ports for multiple examples
- Check the individual README files for specific usage instructions and features
- Examples use various Towns Protocol packages depending on their functionality
- Start with quickstart examples to understand the fundamentals before moving to more complex ones

## Project Structure

Each example follows a consistent structure:

```
example-name/
├── src/
│   └── index.ts          # Main implementation
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── .env.sample          # Environment variables template
└── README.md            # Example-specific documentation
```
