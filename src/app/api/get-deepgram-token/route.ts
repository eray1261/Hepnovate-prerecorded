import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get your API key from environment variables
    const apiKey = process.env.DEEPGRAM_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Deepgram API key not configured' },
        { status: 500 }
      );
    }
    
    // For simplicity, we're just returning the API key as the token
    // In production, you might want to generate a short-lived token
    return NextResponse.json({
      token: apiKey
    });
  } catch (error) {
    console.error('Error providing Deepgram token:', error);
    return NextResponse.json(
      { error: 'Failed to provide Deepgram token' },
      { status: 500 }
    );
  }
}