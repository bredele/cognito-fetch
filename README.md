# cognito-fetch

A lightweight TypeScript utility for making HTTP requests to AWS Cognito Identity Provider service endpoints with optional AWS4 request signing.

## Installation

```bash
npm install cognito-fetch
```

## Usage

```typescript
import cognitoFetch from 'cognito-fetch';

// Basic request without signing
const response = await cognitoFetch(
  'AWSCognitoIdentityProviderService.InitiateAuth',
  {
    region: 'us-east-1',
    accessKeyId: 'AKIA...',
    secretAccessKey: 'secret...',
    body: {
      ClientId: 'your-client-id',
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: 'user@example.com',
        PASSWORD: 'password123',
      },
    },
  }
);
```

## API Signature

```typescript
export type CognitoTarget = `AWSCognitoIdentityProviderService.${string}`;

export interface CognitoFetchOptions {
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  body: any;
  signed?: boolean;
}

export default function cognitoFetch(
  target: CognitoTarget,
  options: CognitoFetchOptions
): Promise<any>;
```
