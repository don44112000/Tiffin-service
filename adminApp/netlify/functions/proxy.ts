/// <reference types="node" />
import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  const { httpMethod, queryStringParameters, body } = event;

  const GOOGLE_URL = process.env.VITE_API_BASE_URL;
  const SECRET = process.env.VITE_API_SECRET;

  if (!GOOGLE_URL || !SECRET) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Backend configuration missing' }),
    };
  }

  try {
    let response;

    if (httpMethod === 'GET') {
      const params = new URLSearchParams({ ...queryStringParameters, secret: SECRET });
      response = await fetch(`${GOOGLE_URL}?${params.toString()}`);
    } else if (httpMethod === 'POST') {
      let parsedBody = {};
      try {
        parsedBody = JSON.parse(body || '{}');
      } catch {
        // Fallback for non-JSON body
      }

      response = await fetch(GOOGLE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ ...parsedBody, secret: SECRET }),
      });
    } else {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const data = await response.json();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('Proxy error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Internal Server Error' }),
    };
  }
};
