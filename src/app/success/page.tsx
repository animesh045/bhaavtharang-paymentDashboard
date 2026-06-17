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
  const status = (resolvedSearchParams.status as string) || '';

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

  const isPendingVerification = status === 'pending_verification' && booking.bookingStatus !== 'confirmed';

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
          
          {/* Glowing Check/Clock Icon */}
          {isPendingVerification ? (
            <div className="mx-auto h-20 w-20 rounded-full bg-amber-500/10 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20 animate-pulse">
              <Clock className="h-10 w-10" />
            </div>
          ) : (
            <div className="mx-auto h-20 w-20 rounded-full bg-indigo-500/10 border-2 border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/20 animate-bounce">
              <CheckCircle2 className="h-10 w-10" />
            </div>
          )}

          <div className="space-y-3">
            <span className={`text-xs font-bold uppercase tracking-widest ${isPendingVerification ? 'text-amber-400' : 'text-indigo-400'}`}>
              {isPendingVerification ? 'Booking Pending Verification' : 'Appointment Confirmed'}
            </span>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none text-white">
              {isPendingVerification ? 'Booking Received!' : "You're Ready to Tune In"}
            </h1>
            <p className="text-slate-400 text-sm max-w-lg mx-auto">
              {isPendingVerification ? (
                <>
                  Hi <strong className="text-slate-200">{booking.customerName}</strong>, we have registered your slot. Please complete your UPI transaction. Once verified, your calendar invitation and Zoom details will be generated.
                </>
              ) : (
                <>
                  Hi <strong className="text-slate-200">{booking.customerName}</strong>, your premium consultation booking is verified. We've reserved your slot and scheduled your practitioner.
                </>
              )}
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
                <span className="text-slate-500 block mb-0.5">Payment Status</span>
                <span className={`font-mono font-bold ${isPendingVerification ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {isPendingVerification ? 'Pending UPI Verification' : 'Paid & Confirmed'}
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
              {!isPendingVerification && booking.zoomJoinUrl && (
                <div className="flex items-center space-x-3 text-slate-300">
                  <Video className="h-5 w-5 text-indigo-400 flex-shrink-0" />
                  <span className="truncate">Meeting link generated</span>
                </div>
              )}
            </div>
          </div>

          {/* Interactive UPI instructions or Zoom Join CTA */}
          {isPendingVerification ? (
            <div className="max-w-xl mx-auto bg-amber-950/10 border border-amber-500/20 rounded-2xl p-5 text-left space-y-4">
              <h4 className="font-bold text-xs text-amber-400 uppercase tracking-wider">UPI Payment Instructions</h4>
              <p className="text-xs text-slate-300 leading-normal">
                Please transfer the session fee of **₹120.00** to the following UPI address if you haven't completed it:
              </p>
              <div className="bg-black/40 p-3.5 rounded-xl flex flex-col space-y-2 text-xs font-semibold">
                <div className="flex justify-between">
                  <span className="text-slate-500">UPI Address:</span>
                  <span className="text-slate-200 select-all">9868842836@superyes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount:</span>
                  <span className="text-indigo-300">₹120.00 INR</span>
                </div>
              </div>
              <a
                href={`https://upi.pe/9868842836@superyes/120.00`}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all text-xs"
              >
                <span>Launch UPI Payment Link</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ) : booking.zoomJoinUrl ? (
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
              {isPendingVerification ? (
                <>
                  <li>
                    <strong>Payment Verification:</strong> Our administrator checks incoming UPI transactions within 2-4 hours.
                  </li>
                  <li>
                    <strong>Check Email:</strong> Once verified, your calendar invitation and Zoom details will be generated and emailed instantly.
                  </li>
                  <li>
                    <strong>Contact Support:</strong> For immediate approvals, share your payment receipt with reference code <strong className="text-indigo-400">{booking.id}</strong> to support@metavibronics.com.
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <strong>Check Calendar:</strong> A Google Calendar invite has been scheduled and shared with your practitioner.
                  </li>
                  <li>
                    <strong>Preparation:</strong> Have a working microphone, high-speed connection, and quiet environment ready.
                  </li>
                  <li>
                    <strong>Follow Up:</strong> Session summary and diagnostic logs will be emailed to you after completion.
                  </li>
                </>
              )}
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
            Need help? Contact our support desk at{' '}
            <strong className="text-slate-400">support@metavibronics.com</strong> or call{' '}
            <strong className="text-slate-400">+1 (800) VIBRONICS</strong>
          </p>
          <p>&copy; {new Date().getFullYear()} Meta Vibronics Protype. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
