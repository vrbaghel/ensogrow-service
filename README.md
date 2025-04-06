# EnsoGrow Service

A Node.js Express API service for EnsoGrow.

## Features

- Express.js with TypeScript
- Environment configuration with dotenv
- CORS enabled
- Request logging with Morgan
- Error handling middleware
- Development mode with nodemon

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/vrbaghel/ensogrow-service.git
cd ensogrow-service
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and configure your environment variables:
```
PORT=3000
NODE_ENV=development
```

## Development

To start the development server:
```bash
npm run dev
```

The server will start on http://localhost:3000

## Building for Production

To build the project:
```bash
npm run build
```

To start the production server:
```bash
npm start
```

## Project Structure

```
ensogrow-service/
├── src/            # Source files
│   └── app.ts      # Main application file
├── dist/           # Compiled files (generated)
├── .env            # Environment variables
├── package.json    # Project dependencies and scripts
└── tsconfig.json   # TypeScript configuration
```

## License

ISC