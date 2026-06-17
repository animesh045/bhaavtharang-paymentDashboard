import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { CheckCircle2, Calendar, Clock, Video, Mail, Phone, ExternalLink, Sparkles, ArrowLeft } from 'lucide-react';

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const bookingId = (resolvedSearchParams.bookingId as string) || '';

  let booking = null;
  if (bookingId) {
    booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });
  }

  if (!booking) {
    return (
      <div className="bg-[#0a0a0b] text-slate-100 min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-6">
          <h2 className="text-2xl font-black text-rose-400">Booking Reference Not Found</h2>
          <p className="text-slate-400 text-sm">
            We couldn't locate a booking with reference <strong className="text-white">{bookingId || 'N/A'}</strong>.
            If you recently paid, please check your email for the confirmation link or contact support.
          </p>
          <Link
            href="/"
            className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Landing Page</span>
          </Link>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(booking.scheduledTime).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = new Date(booking.scheduledTime).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="bg-[#0a0a0b] text-slate-100 min-h-screen selection:bg-indigo-500 relative overflow-hidden flex flex-col justify-between">
      {/* Decorative glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-radial-glow -z-10 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-radial-glow-purple -z-10 pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-800/60 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-[1.5px] shadow-lg">
              <div className="h-full w-full bg-[#0d0d12] rounded-[10px] flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-indigo-400" />
              </div>
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
              META VIBRONICS
            </span>
          </Link>
        </div>
      </header>

      {/* Main Success Container */}
      <main className="max-w-3xl mx-auto px-6 py-16 w-full">
        <div className="glass-card rounded-3xl p-8 md:p-12 text-center space-y-8 relative overflow-hidden">
          {/* Glowing Check Icon */}
          <div className="mx-auto h-20 w-20 rounded-full bg-indigo-500/10 border-2 border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/20 animate-bounce">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <div className="space-y-3">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Appointment Confirmed</span>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none text-white">
              You're Ready to Tune In
            </h1>
            <p className="text-slate-400 text-sm max-w-lg mx-auto">
              Hi <strong className="text-slate-200">{booking.customerName}</strong>, your premium consultation booking is verified. We've reserved your slot and scheduled your practitioner.
            </p>
          </div>

          {/* Booking Summary Box */}
          <div className="bg-[#0c0c11] border border-slate-800/80 rounded-2xl p-6 text-left space-y-4 max-w-xl mx-auto">
            <div className="grid grid-cols-2 gap-4 border-b border-slate-800/60 pb-4 text-xs">
              <div>
                <span className="text-slate-500 block mb-0.5">Booking Reference</span>
                <span className="font-mono font-bold text-slate-300">{booking.id}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Payment Reference</span>
                <span className="font-mono font-bold text-slate-300 text-ellipsis overflow-hidden block">
                  {booking.paymentId || 'Verified'}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-3 text-slate-300">
                <Calendar className="h-5 w-5 text-indigo-400 flex-shrink-0" />
                <span>{formattedDate}</span>
              </div>
              <div className="flex items-center space-x-3 text-slate-300">
                <Clock className="h-5 w-5 text-indigo-400 flex-shrink-0" />
                <span>{formattedTime} (60 Minutes)</span>
              </div>
              {booking.zoomJoinUrl && (
                <div className="flex items-center space-x-3 text-slate-300">
                  <Video className="h-5 w-5 text-indigo-400 flex-shrink-0" />
                  <span className="truncate">Meeting link generated</span>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Zoom Join CTA */}
          {booking.zoomJoinUrl ? (
            <div className="max-w-xl mx-auto space-y-3">
              <a
                href={booking.zoomJoinUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 px-8 rounded-xl shadow-xl shadow-indigo-600/30 transition-all transform hover:scale-[1.01]"
              >
                <span>Join Zoom Meeting</span>
                <ExternalLink className="h-4.5 w-4.5" />
              </a>
              <p className="text-[10px] text-slate-500">
                This meeting will be active 10 minutes prior to scheduled start. Same link was sent to{' '}
                <strong className="text-slate-400">{booking.email || 'your phone number'}</strong>.
              </p>
            </div>
          ) : (
            <div className="text-amber-400/90 text-xs font-semibold bg-amber-950/20 border border-amber-500/30 p-4 rounded-xl max-w-xl mx-auto">
              Generating meeting link. We will send the details via email/SMS shortly.
            </div>
          )}

          {/* Next Steps & Reassurance */}
          <div className="max-w-xl mx-auto text-left space-y-4 pt-4 border-t border-slate-800/40">
            <h3 className="font-bold text-sm text-slate-200 uppercase tracking-wider">Next Steps</h3>
            <ul className="text-xs text-slate-400 space-y-2.5 list-disc pl-4 leading-normal">
              <li>
                <strong>Check Calendar:</strong> A Google Calendar invite has been scheduled and shared with your practitioner.
              </li>
              <li>
                <strong>Preparation:</strong> Have a working microphone, high-speed connection, and quiet environment ready.
              </li>
              <li>
                <strong>Follow Up:</strong> Session summary and diagnostic logs will be emailed to you after completion.
              </li>
            </ul>
          </div>

          {/* Back Button */}
          <div className="pt-6">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-500 hover:text-indigo-400 transition-colors inline-flex items-center space-x-1.5"
            >
              <span>Back to home</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-black/40 py-8 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-6 space-y-3">
          <p>
            Need help? Contact our elite support desk at{' '}
            <strong className="text-slate-400">support@metavibronics.com</strong> or call{' '}
            <strong className="text-slate-400">+1 (800) VIBRONICS</strong>
          </p>
          <p>&copy; {new Date().getFullYear()} Meta Vibronics Protype. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
