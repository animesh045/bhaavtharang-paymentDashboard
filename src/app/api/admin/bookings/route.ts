import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    // 1. Authenticate admin
    const cookieStore = await cookies();
    const session = cookieStore.get('admin_session')?.value;
    if (session !== 'authenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const bookingStatus = searchParams.get('bookingStatus') || '';
    const paymentStatus = searchParams.get('paymentStatus') || '';

    // 2. Build Prisma filter query
    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { customerName: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { notes: { contains: search } },
        { id: { contains: search } },
        { orderId: { contains: search } },
        { paymentId: { contains: search } },
      ];
    }

    if (bookingStatus) {
      whereClause.bookingStatus = bookingStatus;
    }

    if (paymentStatus) {
      whereClause.paymentStatus = paymentStatus;
    }

    // 3. Fetch bookings sorted by created date descending
    const bookings = await prisma.booking.findMany({
      where: whereClause,
      orderBy: {
        scheduledTime: 'asc', // Show closest meetings first
      },
    });

    // 4. Compute metrics for the admin panel dashboard
    const allBookings = await prisma.booking.findMany();

    const totalBookings = allBookings.length;
    
    // Revenue in INR (amount is in paise)
    const totalRevenue = allBookings
      .filter((b) => b.paymentStatus === 'paid')
      .reduce((sum, b) => sum + b.amount / 100, 0);

    // Calculate today's bookings (scheduled for the current day)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todaysBookingsCount = allBookings.filter((b) => {
      const scheduled = new Date(b.scheduledTime);
      return scheduled >= startOfToday && scheduled <= endOfToday;
    }).length;

    // Upcoming meetings count (scheduled in the future and paid)
    const upcomingMeetingsCount = allBookings.filter((b) => {
      const scheduled = new Date(b.scheduledTime);
      return scheduled > new Date() && b.paymentStatus === 'paid' && b.bookingStatus === 'confirmed';
    }).length;

    return NextResponse.json({
      bookings,
      metrics: {
        totalBookings,
        totalRevenue,
        todaysBookings: todaysBookingsCount,
        upcomingMeetings: upcomingMeetingsCount,
      },
    });
  } catch (error) {
    console.error('Error fetching admin bookings:', error);
    return NextResponse.json({ error: 'Internal server error fetching bookings' }, { status: 500 });
  }
}
