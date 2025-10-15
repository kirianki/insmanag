import { NextResponse } from 'next/server';

export async function POST() {
  // Create a response object
  const response = NextResponse.json({ message: 'Logout successful' }, { status: 200 });

  // Set the cookie with an immediate expiration date to effectively delete it
  response.cookies.set('accessToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    expires: new Date(0), // Set expiry to a past date
  });

  return response;
}