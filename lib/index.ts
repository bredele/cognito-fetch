import * as aws4 from "aws4";

export type CognitoTarget = `AWSCognitoIdentityProviderService.${string}`;

export interface CognitoFetchOptions {
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  body: any;
  signed?: boolean;
}

/**
 * Makes HTTP requests to AWS Cognito Identity Provider service endpoints.
 *
 * This function handles the low-level HTTP communication with AWS Cognito,
 * including optional AWS4 request signing for authenticated operations.
 * Credentials and region can be provided via function parameters or
 * environment variables (AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY).
 */

export default async function cognitoFetch(
  target: CognitoTarget,
  options: CognitoFetchOptions
) {
  const {
    AWS_REGION,
    AWS_DEFAULT_REGION,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
  } = process.env;
  const region = options.region || AWS_REGION || AWS_DEFAULT_REGION;
  const accessKeyId = options.accessKeyId || AWS_ACCESS_KEY_ID;
  const secretAccessKey = options.secretAccessKey || AWS_SECRET_ACCESS_KEY;
  const url = `https://cognito-idp.${region}.amazonaws.com/`;
  const abort = new AbortController();
  const requestOptions = {
    signal: abort.signal,
    service: "cognito-idp",
    region: region,
    method: "POST",
    url,
    headers: {
      "x-amz-target": target,
      "content-type": "application/x-amz-json-1.1",
    },
    body: JSON.stringify(options.body),
  };

  if (options.signed) {
    aws4.sign(requestOptions, {
      accessKeyId,
      secretAccessKey,
    });
  }

  const res = await fetch(url, requestOptions);
  return await res.json();
}
