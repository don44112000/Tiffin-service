/// <reference types="node" />
import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (!ADMIN_PASSWORD) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Server misconfigured' }),
    };
  }

  try {
    const { password } = JSON.parse(event.body || '{}');

    if (password === ADMIN_PASSWORD) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true }),
      };
    }

    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, message: 'Invalid password' }),
    };
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, message: 'Bad request' }),
    };
  }
};
