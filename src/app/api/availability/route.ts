import { NextResponse } from 'next/server';
import { getAvailableSlots } from '@/lib/calendar';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    if (!dateParam) {
      return NextResponse.json({ error: 'Date parameter is required (YYYY-MM-DD)' }, { status: 400 });
    }

    const date = new Date(dateParam);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    const slots = await getAvailableSlots(date);
    return NextResponse.json({ slots });
  } catch (error) {
    console.error('Error fetching availability slots:', error);
    return NextResponse.json(
      { error: 'Internal server error fetching available slots' },
      { status: 500 }
    );
  }
}
