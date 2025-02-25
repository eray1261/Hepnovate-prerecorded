import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { imageData, filePath } = await req.json();

    // Remove the data URL prefix
    const base64Data = imageData.replace(/^data:image\/png;base64,/, '');

    // Ensure the directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // Write the file to the specified path
    await fs.writeFile(filePath, base64Data, 'base64');

    return NextResponse.json(
      { success: true, message: 'Image saved successfully!' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error saving image:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save image.' },
      { status: 500 }
    );
  }
}