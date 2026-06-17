import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  return NextResponse.json({ error: 'Razorpay integration removed' }, { status: 404 });
}
