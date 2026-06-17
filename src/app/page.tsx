'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Video, User, Phone, Mail, FileText, CheckCircle2, Shield, Flame, Sparkles } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Booking Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  
  // Date & Availability States
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Generate next 7 days starting from tomorrow
  const [datesList, setDatesList] = useState<Date[]>([]);

  useEffect(() => {
    const list: Date[] = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      list.push(d);
    }
    setDatesList(list);
    // Select tomorrow by default
    setSelectedDate(list[0]);
  }, []);

  // Fetch slots whenever selectedDate changes
  useEffect(() => {
    if (!selectedDate) return;
    
    const fetchSlots = async () => {
      setLoadingSlots(true);
      setErrorMsg('');
      setAvailableSlots([]);
      setSelectedSlot(null);
      
      try {
        const formattedDate = selectedDate.toISOString().split('T')[0];
        const res = await fetch(`/api/availability?date=${formattedDate}`);
        const data = await res.json();
        
        if (data.error) {
          setErrorMsg(data.error);
        } else {
          setAvailableSlots(data.slots || []);
        }
      } catch (err) {
        console.error('Error loading slots:', err);
        setErrorMsg('Failed to load available slots.');
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Please enter your phone number.');
      return;
    }
    if (!selectedSlot) {
      setErrorMsg('Please select an available session time slot.');
      return;
    }

    startTransition(async () => {
      try {
        // 1. Create temporary booking and get Razorpay order parameters
        const orderRes = await fetch('/api/pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            phone,
            email: email.trim() || undefined,
            notes: notes.trim() || undefined,
            scheduledTime: selectedSlot,
          }),
        });

        const orderData = await orderRes.json();

        if (!orderRes.ok || orderData.error) {
          setErrorMsg(orderData.error || 'Failed to create payment order. Please try again.');
          return;
        }

        const { orderId, amount, keyId, bookingId } = orderData;

        // 2. Configure and trigger Razorpay Checkout
        const options = {
          key: keyId,
          amount: amount,
          currency: 'INR',
          name: 'Meta Vibronics',
          description: '60-Minute Premium Consultation',
          image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', // glowing abstract shape
          order_id: orderId,
          handler: async function (response: any) {
            setErrorMsg('');
            setLoadingSlots(true); // show general loading during verification
            try {
              // 3. Verify payment on server
              const verifyRes = await fetch('/api/pay/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                  bookingId: bookingId,
                }),
              });

              const verifyData = await verifyRes.json();
              if (verifyRes.ok && verifyData.success) {
                // Redirect to success page
                router.push(`/success?bookingId=${verifyData.bookingId}`);
              } else {
                setErrorMsg(verifyData.error || 'Payment verification failed. Please check with your bank.');
              }
            } catch (vErr) {
              console.error('Error verifying payment:', vErr);
              setErrorMsg('Connection error verifying payment. Do not refresh; we will double-check via email.');
            } finally {
              setLoadingSlots(false);
            }
          },
          prefill: {
            name: name,
            contact: phone,
            email: email || '',
          },
          notes: {
            bookingId: bookingId,
          },
          theme: {
            color: '#6366f1', // Indigo accent
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (response: any) {
          setErrorMsg(`Payment failed: ${response.error.description}`);
        });
        rzp.open();
      } catch (err) {
        console.error('Error initiating checkout:', err);
        setErrorMsg('Failed to initialize Razorpay Checkout. Please try again.');
      }
    });
  };

  const formatDateLabel = (d: Date) => {
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-[#0a0a0b] text-slate-100 min-h-screen selection:bg-indigo-500 selection:text-white relative overflow-hidden flex flex-col justify-between">
      {/* Script Loader for Razorpay Checkout */}
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      {/* Decorative Radial Lights */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-radial-glow -z-10 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-radial-glow-purple -z-10 pointer-events-none" />

      {/* Top Header */}
      <header className="border-b border-slate-800/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => router.push('/')}>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-[1.5px] shadow-lg shadow-indigo-500/20">
              <div className="h-full w-full bg-[#0d0d12] rounded-[10px] flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-indigo-400" />
              </div>
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-200">
              META VIBRONICS
            </span>
          </div>
          <a
            href="#booking-section"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 duration-200"
          >
            Book Session
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 py-12 flex-grow w-full">
        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto mb-16 space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-950/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
            <Flame className="h-3.5 w-3.5 text-indigo-400" />
            <span>High-Performance Diagnostics</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none">
            Unlock Your Peak Energy & <span className="text-gradient">Elite Flow State</span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
            Experience premium bio-resonance tuning and neural coaching. Book an exclusive 60-minute video session with our master practitioners. Complete calendar integration and instant Zoom links included.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-sm text-slate-400 font-semibold">
            <div className="flex items-center space-x-2">
              <Video className="h-4.5 w-4.5 text-indigo-400" />
              <span>60-Min Zoom Session</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4.5 w-4.5 text-indigo-400" />
              <span>Google Calendar Invite</span>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="h-4.5 w-4.5 text-indigo-400" />
              <span>Safe Razorpay Checkout</span>
            </div>
          </div>
        </section>

        {/* Benefits Grid */}
        <section className="grid md:grid-cols-3 gap-6 mb-20">
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-100">Deep Bio-Field Scan</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Identify underlying energy blocks, metabolic efficiency, and neural stress load using virtual vibronic resonance technology.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-100">Actionable Flow Protocols</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Leave with a bespoke 30-day performance regime including light-wave adjustments, breath patterns, and supplement profiles.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Clock className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-100">Real-Time Rescheduling</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Plans changed? Automatically reschedule or re-route your session directly through the secured owner admin panel.
            </p>
          </div>
        </section>

        {/* Booking Interactive Funnel */}
        <section id="booking-section" className="glass-card rounded-3xl p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center md:text-left space-y-2">
              <h2 className="text-2xl md:text-3xl font-extrabold text-white">Schedule Your Session</h2>
              <p className="text-slate-400 text-sm">Select a date, pick an open hour, and confirm your details. Session fee: <strong className="text-indigo-400 font-bold">₹999 INR</strong>.</p>
            </div>

            {errorMsg && (
              <div className="bg-rose-900/30 border border-rose-500/40 text-rose-200 p-4 rounded-xl text-sm flex items-center space-x-2">
                <span className="font-bold">Error:</span>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-10">
              
              {/* Date & Time Selectors */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-3 flex items-center space-x-1.5">
                    <Calendar className="h-4 w-4 text-indigo-400" />
                    <span>1. Select Date</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {datesList.map((dateObj, idx) => {
                      const isSelected = selectedDate?.toDateString() === dateObj.toDateString();
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedDate(dateObj)}
                          className={`p-3 rounded-xl border text-center text-xs font-bold transition-all ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30 scale-105'
                              : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-800/50 hover:border-slate-700'
                          }`}
                        >
                          <div className="opacity-75">{dateObj.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                          <div className="text-sm mt-0.5">{dateObj.getDate()}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-3 flex items-center space-x-1.5">
                    <Clock className="h-4 w-4 text-indigo-400" />
                    <span>2. Select Time Slot (60 Minutes)</span>
                  </label>

                  {loadingSlots ? (
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="animate-pulse h-10 bg-slate-800 rounded-xl" />
                      ))}
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <p className="text-slate-500 text-xs italic bg-slate-900/30 p-4 border border-slate-800/80 rounded-xl">
                      No availability found for this date. Please try another day.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlots.map((slotStr) => {
                        const slotDate = new Date(slotStr);
                        const isSelected = selectedSlot === slotStr;
                        const timeStr = slotDate.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        });
                        return (
                          <button
                            key={slotStr}
                            type="button"
                            onClick={() => setSelectedSlot(slotStr)}
                            className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30 scale-105'
                                : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-800/50'
                            }`}
                          >
                            {timeStr}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Personal Information Form */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-3 flex items-center space-x-1.5">
                    <User className="h-4 w-4 text-indigo-400" />
                    <span>3. Patient Details</span>
                  </label>
                  
                  <div className="space-y-4">
                    <div>
                      <input
                        type="text"
                        placeholder="Full Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full bg-[#0d0d12] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-slate-100 placeholder:text-slate-600 transition-colors"
                      />
                    </div>
                    <div>
                      <input
                        type="tel"
                        placeholder="Phone Number (e.g. +91 9999999999)"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="w-full bg-[#0d0d12] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-slate-100 placeholder:text-slate-600 transition-colors"
                      />
                    </div>
                    <div>
                      <input
                        type="email"
                        placeholder="Email Address (Optional)"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-[#0d0d12] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-slate-100 placeholder:text-slate-600 transition-colors"
                      />
                    </div>
                    <div>
                      <textarea
                        placeholder="Describe any target wellness outcomes, stress loads, or notes (Optional)"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className="w-full bg-[#0d0d12] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-slate-100 placeholder:text-slate-600 transition-colors resize-none"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPending || loadingSlots}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-xl shadow-indigo-600/30 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 duration-150 flex items-center justify-center space-x-2 text-sm"
                >
                  {isPending ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Initiating Checkout...</span>
                    </>
                  ) : (
                    <span>Pay ₹999 & Confirm Booking</span>
                  )}
                </button>

                <p className="text-center text-[10px] text-slate-500 leading-normal">
                  By booking, you agree to our 24h cancellation terms. Payments are processed securely via Razorpay Checkout. Zoom links will be generated automatically.
                </p>
              </div>

            </form>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-black/40 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div>
            &copy; {new Date().getFullYear()} Meta Vibronics Protype. All rights reserved.
          </div>
          <div className="flex space-x-6">
            <a href="#" className="hover:text-slate-300">Privacy Policy</a>
            <a href="#" className="hover:text-slate-300">Terms of Service</a>
            <a href="/admin" className="hover:text-indigo-400 font-bold flex items-center space-x-1">
              <span>Admin Portal</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
