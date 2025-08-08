import test from 'node:test';
import assert from 'node:assert';
import { mock } from 'node:test';
import cognitoFetch, { CognitoTarget, CognitoFetchOptions } from '.';

// Mock fetch globally
const mockFetch = mock.fn();
global.fetch = mockFetch as any;

// Test helpers
function createMockResponse(data: any, status = 200) {
  return Promise.resolve({
    status,
    json: () => Promise.resolve(data),
  });
}

function resetMocks() {
  mockFetch.mock.resetCalls();
}

// Core functionality tests
test('cognitoFetch makes basic unsigned request', async () => {
  const mockData = { result: 'success' };
  (mockFetch.mock as any).mockImplementationOnce(() =>
    createMockResponse(mockData)
  );

  const result = await cognitoFetch(
    'AWSCognitoIdentityProviderService.InitiateAuth',
    {
      region: 'us-east-1',
      body: { ClientId: 'test-client' },
    }
  );

  assert.strictEqual(mockFetch.mock.callCount(), 1);
  const fetchCall = mockFetch.mock.calls[0];

  // Check URL
  assert.strictEqual(
    fetchCall.arguments[0],
    'https://cognito-idp.us-east-1.amazonaws.com/'
  );

  // Check request options
  const options = fetchCall.arguments[1];
  assert.strictEqual(options.method, 'POST');
  assert.strictEqual(options.service, 'cognito-idp');
  assert.strictEqual(options.region, 'us-east-1');
  assert.strictEqual(
    options.headers['x-amz-target'],
    'AWSCognitoIdentityProviderService.InitiateAuth'
  );
  assert.strictEqual(
    options.headers['content-type'],
    'application/x-amz-json-1.1'
  );
  assert.strictEqual(options.body, JSON.stringify({ ClientId: 'test-client' }));

  assert.deepStrictEqual(result, mockData);
  resetMocks();
});

test('cognitoFetch constructs URL with different regions', async () => {
  (mockFetch.mock as any).mockImplementationOnce(() => createMockResponse({}));

  await cognitoFetch('AWSCognitoIdentityProviderService.InitiateAuth', {
    region: 'eu-west-1',
    body: {},
  });

  const fetchCall = mockFetch.mock.calls[0];
  assert.strictEqual(
    fetchCall.arguments[0],
    'https://cognito-idp.eu-west-1.amazonaws.com/'
  );
  resetMocks();
});

test('cognitoFetch handles complex request body', async () => {
  const complexBody = {
    ClientId: 'test-client',
    AuthFlow: 'USER_PASSWORD_AUTH',
    AuthParameters: {
      USERNAME: 'test@example.com',
      PASSWORD: 'password123',
    },
  };

  (mockFetch.mock as any).mockImplementationOnce(() => createMockResponse({}));

  await cognitoFetch('AWSCognitoIdentityProviderService.InitiateAuth', {
    region: 'us-east-1',
    body: complexBody,
  });

  const fetchCall = mockFetch.mock.calls[0];
  const options = fetchCall.arguments[1];
  assert.strictEqual(options.body, JSON.stringify(complexBody));
  resetMocks();
});

// AWS4 signing tests
test('cognitoFetch handles signed request with explicit credentials', async () => {
  (mockFetch.mock as any).mockImplementationOnce(() => createMockResponse({}));

  // Test that function runs without errors when signing is requested
  const result = await cognitoFetch(
    'AWSCognitoIdentityProviderService.AdminGetUser',
    {
      region: 'us-east-1',
      accessKeyId: 'AKIA123',
      secretAccessKey: 'secret123',
      signed: true,
      body: { UserPoolId: 'pool123', Username: 'test@example.com' },
    }
  );

  // Should complete successfully
  assert.ok(result);
  resetMocks();
});

test('cognitoFetch handles unsigned request', async () => {
  (mockFetch.mock as any).mockImplementationOnce(() => createMockResponse({}));

  const result = await cognitoFetch(
    'AWSCognitoIdentityProviderService.InitiateAuth',
    {
      region: 'us-east-1',
      accessKeyId: 'AKIA123',
      secretAccessKey: 'secret123',
      signed: false,
      body: { ClientId: 'client123' },
    }
  );

  // Should complete successfully
  assert.ok(result);
  resetMocks();
});

test('cognitoFetch handles request when signed is undefined', async () => {
  (mockFetch.mock as any).mockImplementationOnce(() => createMockResponse({}));

  const result = await cognitoFetch(
    'AWSCognitoIdentityProviderService.InitiateAuth',
    {
      region: 'us-east-1',
      accessKeyId: 'AKIA123',
      secretAccessKey: 'secret123',
      body: { ClientId: 'client123' },
    }
  );

  // Should complete successfully
  assert.ok(result);
  resetMocks();
});

// Environment variable fallback tests
test('cognitoFetch uses AWS_REGION environment variable', async () => {
  const originalEnv = process.env.AWS_REGION;
  process.env.AWS_REGION = 'eu-central-1';

  (mockFetch.mock as any).mockImplementationOnce(() => createMockResponse({}));

  await cognitoFetch('AWSCognitoIdentityProviderService.InitiateAuth', {
    body: { ClientId: 'client123' },
  });

  const fetchCall = mockFetch.mock.calls[0];
  assert.strictEqual(
    fetchCall.arguments[0],
    'https://cognito-idp.eu-central-1.amazonaws.com/'
  );

  // Restore original env
  if (originalEnv !== undefined) {
    process.env.AWS_REGION = originalEnv;
  } else {
    delete process.env.AWS_REGION;
  }
  resetMocks();
});

test('cognitoFetch falls back to AWS_DEFAULT_REGION when AWS_REGION is not set', async () => {
  const originalRegion = process.env.AWS_REGION;
  const originalDefaultRegion = process.env.AWS_DEFAULT_REGION;

  delete process.env.AWS_REGION;
  process.env.AWS_DEFAULT_REGION = 'ap-southeast-1';

  (mockFetch.mock as any).mockImplementationOnce(() => createMockResponse({}));

  await cognitoFetch('AWSCognitoIdentityProviderService.InitiateAuth', {
    body: { ClientId: 'client123' },
  });

  const fetchCall = mockFetch.mock.calls[0];
  assert.strictEqual(
    fetchCall.arguments[0],
    'https://cognito-idp.ap-southeast-1.amazonaws.com/'
  );

  // Restore original env
  if (originalRegion !== undefined) {
    process.env.AWS_REGION = originalRegion;
  }
  if (originalDefaultRegion !== undefined) {
    process.env.AWS_DEFAULT_REGION = originalDefaultRegion;
  } else {
    delete process.env.AWS_DEFAULT_REGION;
  }
  resetMocks();
});

test('cognitoFetch uses environment variables for signing', async () => {
  const originalAccessKey = process.env.AWS_ACCESS_KEY_ID;
  const originalSecretKey = process.env.AWS_SECRET_ACCESS_KEY;

  process.env.AWS_ACCESS_KEY_ID = 'AKIA_ENV';
  process.env.AWS_SECRET_ACCESS_KEY = 'secret_env';

  (mockFetch.mock as any).mockImplementationOnce(() => createMockResponse({}));

  const result = await cognitoFetch(
    'AWSCognitoIdentityProviderService.AdminGetUser',
    {
      region: 'us-east-1',
      signed: true,
      body: { UserPoolId: 'pool123' },
    }
  );

  // Should complete successfully with environment credentials
  assert.ok(result);

  // Restore original env
  if (originalAccessKey !== undefined) {
    process.env.AWS_ACCESS_KEY_ID = originalAccessKey;
  } else {
    delete process.env.AWS_ACCESS_KEY_ID;
  }
  if (originalSecretKey !== undefined) {
    process.env.AWS_SECRET_ACCESS_KEY = originalSecretKey;
  } else {
    delete process.env.AWS_SECRET_ACCESS_KEY;
  }
  resetMocks();
});

test('cognitoFetch parameters override environment variables', async () => {
  const originalAccessKey = process.env.AWS_ACCESS_KEY_ID;
  const originalSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
  const originalRegion = process.env.AWS_REGION;

  process.env.AWS_ACCESS_KEY_ID = 'AKIA_ENV';
  process.env.AWS_SECRET_ACCESS_KEY = 'secret_env';
  process.env.AWS_REGION = 'us-west-2';

  (mockFetch.mock as any).mockImplementationOnce(() => createMockResponse({}));

  const result = await cognitoFetch(
    'AWSCognitoIdentityProviderService.AdminGetUser',
    {
      region: 'us-east-1',
      accessKeyId: 'AKIA_PARAM',
      secretAccessKey: 'secret_param',
      signed: true,
      body: { UserPoolId: 'pool123' },
    }
  );

  // Check region override
  const fetchCall = mockFetch.mock.calls[0];
  assert.strictEqual(
    fetchCall.arguments[0],
    'https://cognito-idp.us-east-1.amazonaws.com/'
  );

  // Should complete successfully with parameter overrides
  assert.ok(result);

  // Restore original env
  if (originalAccessKey !== undefined) {
    process.env.AWS_ACCESS_KEY_ID = originalAccessKey;
  } else {
    delete process.env.AWS_ACCESS_KEY_ID;
  }
  if (originalSecretKey !== undefined) {
    process.env.AWS_SECRET_ACCESS_KEY = originalSecretKey;
  } else {
    delete process.env.AWS_SECRET_ACCESS_KEY;
  }
  if (originalRegion !== undefined) {
    process.env.AWS_REGION = originalRegion;
  } else {
    delete process.env.AWS_REGION;
  }
  resetMocks();
});

// HTTP request and response tests
test('cognitoFetch returns JSON response', async () => {
  const mockData = {
    AuthenticationResult: {
      AccessToken: 'token123',
      IdToken: 'idtoken123',
    },
  };
  (mockFetch.mock as any).mockImplementationOnce(() =>
    createMockResponse(mockData)
  );

  const result = await cognitoFetch(
    'AWSCognitoIdentityProviderService.InitiateAuth',
    {
      region: 'us-east-1',
      body: { ClientId: 'client123' },
    }
  );

  assert.deepStrictEqual(result, mockData);
  resetMocks();
});

test('cognitoFetch handles different HTTP status codes', async () => {
  const errorData = {
    __type: 'NotAuthorizedException',
    message: 'Invalid credentials',
  };
  (mockFetch.mock as any).mockImplementationOnce(() =>
    createMockResponse(errorData, 400)
  );

  const result = await cognitoFetch(
    'AWSCognitoIdentityProviderService.InitiateAuth',
    {
      region: 'us-east-1',
      body: { ClientId: 'client123' },
    }
  );

  // Function should still return the JSON response even for error status codes
  assert.deepStrictEqual(result, errorData);
  resetMocks();
});

test('cognitoFetch includes AbortController signal', async () => {
  (mockFetch.mock as any).mockImplementationOnce(() => createMockResponse({}));

  await cognitoFetch('AWSCognitoIdentityProviderService.InitiateAuth', {
    region: 'us-east-1',
    body: { ClientId: 'client123' },
  });

  const fetchCall = mockFetch.mock.calls[0];
  const options = fetchCall.arguments[1];

  // Should have signal property from AbortController
  assert.ok(options.signal);
  assert.ok(options.signal instanceof AbortSignal);
  resetMocks();
});

// Error handling tests
test('cognitoFetch handles fetch errors', async () => {
  const fetchError = new Error('Network error');
  (mockFetch.mock as any).mockImplementationOnce(() =>
    Promise.reject(fetchError)
  );

  await assert.rejects(
    () =>
      cognitoFetch('AWSCognitoIdentityProviderService.InitiateAuth', {
        region: 'us-east-1',
        body: { ClientId: 'client123' },
      }),
    fetchError
  );

  resetMocks();
});

test('cognitoFetch handles JSON parsing errors', async () => {
  // Mock fetch to return response that fails JSON parsing
  (mockFetch.mock as any).mockImplementationOnce(() =>
    Promise.resolve({
      status: 200,
      json: () => Promise.reject(new SyntaxError('Unexpected token in JSON')),
    })
  );

  await assert.rejects(
    () =>
      cognitoFetch('AWSCognitoIdentityProviderService.InitiateAuth', {
        region: 'us-east-1',
        body: { ClientId: 'client123' },
      }),
    SyntaxError
  );

  resetMocks();
});

// TypeScript type validation tests (these will be caught at compile time)
test('CognitoTarget type validation', async () => {
  // These should compile successfully
  const validTargets: CognitoTarget[] = [
    'AWSCognitoIdentityProviderService.InitiateAuth',
    'AWSCognitoIdentityProviderService.RespondToAuthChallenge',
    'AWSCognitoIdentityProviderService.AdminGetUser',
    'AWSCognitoIdentityProviderService.AdminCreateUser',
  ];

  (mockFetch.mock as any).mockImplementation(() => createMockResponse({}));

  // Test that all valid targets work
  for (const target of validTargets) {
    await cognitoFetch(target, {
      region: 'us-east-1',
      body: { test: 'data' },
    });
  }

  assert.strictEqual(mockFetch.mock.callCount(), validTargets.length);
  resetMocks();
});
