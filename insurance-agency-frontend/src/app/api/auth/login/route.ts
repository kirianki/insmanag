import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function POST(req: NextRequest) {
  try {
    if (!API_URL) throw new Error("API_URL is not defined.");
    const { email, password } = await req.json();
    const response = await axios.post(`${API_URL}/accounts/auth/token/`, { email, password });

    // **THE FIX:** Get both access and refresh tokens from the backend response.
    const { access, refresh } = response.data;

    if (!access || !refresh) {
      return NextResponse.json({ message: 'Token not received' }, { status: 401 });
    }

    // **THE FIX:** Return both tokens in the response body.
    return NextResponse.json({ accessToken: access, refreshToken: refresh }, { status: 200 });

  } catch (error: any) {
    console.error('Login API route error:', error.response?.data || error.message);
    return NextResponse.json(
      { message: error.response?.data?.detail || 'Invalid credentials' },
      { status: error.response?.status || 401 }
    );
  }
}