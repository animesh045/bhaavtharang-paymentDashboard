'use client';

import React, { useState, useEffect, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  DollarSign,
  Users,
  Calendar,
  Video,
  Search,
  Filter,
  LogOut,
  CheckCircle,
  Clock,
  XCircle,
  Edit2,
  RefreshCw,
  Download,
  Sparkles,
  ExternalLink,
  ChevronRight,
  X,
  Phone,
  Mail,
  FileText
} from 'lucide-react';

interface Booking {
  id: string;
  customerName: string;
  phone: string;
  email: string | null;
  notes: string | null;
  amount: number;
  orderId: string;
  paymentId: string | null;
  paymentStatus: string;
  bookingStatus: string;
  zoomMeetingId: string | null;
  zoomJoinUrl: string | null;
  zoomStartUrl: string | null;
  calendarEventId: string | null;
  scheduledTime: string;
  createdAt: string;
}

interface Metrics {
  totalBookings: number;
  totalRevenue: number;
  todaysBookings: number;
  upcomingMeetings: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  
  // Data States
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalBookings: 0,
    totalRevenue: 0,
    todaysBookings: 0,
    upcomingMeetings: 0,
  });
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [bookingFilter, setBookingFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  
  // Edit form states
  const [newTime, setNewTime] = useState('');
  const [updatingAction, setUpdatingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.append('search', search);
      if (bookingFilter) q.append('bookingStatus', bookingFilter);
      if (paymentFilter) q.append('paymentStatus', paymentFilter);

      const res = await fetch(`/api/admin/bookings?${q.toString()}`);
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      setBookings(data.bookings || []);
      setMetrics(data.metrics || {
        totalBookings: 0,
        totalRevenue: 0,
        todaysBookings: 0,
        upcomingMeetings: 0,
      });
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [search, bookingFilter, paymentFilter]);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/admin/login');
    } catch (err) {
      console.error('Failed to log out:', err);
    }
  };

  const handleBookingAction = async (action: string, extraBody = {}) => {
    if (!selectedBooking) return;
    setUpdatingAction(action);
    setActionError('');

    try {
      const res = await fetch(`/api/admin/bookings/${selectedBooking.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extraBody }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        // Update selection and refresh list
        setSelectedBooking(data.booking);
        fetchDashboardData();
      } else {
        setActionError(data.error || 'Failed to complete action.');
      }
    } catch (err) {
      console.error('Error executing admin action:', err);
      setActionError('Network error executing request.');
    } finally {
      setUpdatingAction(null);
    }
  };

  const exportToCSV = () => {
    if (bookings.length === 0) return;
    const headers = [
      'Booking ID',
      'Customer Name',
      'Phone',
      'Email',
      'Amount (INR)',
      'Scheduled Time',
      'Booking Status',
      'Payment Status',
      'Zoom Join Link',
      'Google Event ID',
      'Created At',
    ];

    const rows = bookings.map((b) => [
      b.id,
      b.customerName,
      b.phone,
      b.email || 'N/A',
      (b.amount / 100).toFixed(2),
      new Date(b.scheduledTime).toISOString(),
      b.bookingStatus,
      b.paymentStatus,
      b.zoomJoinUrl || 'N/A',
      b.calendarEventId || 'N/A',
      new Date(b.createdAt).toISOString(),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `meta_vibronics_bookings_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-[#070709] text-slate-100 min-h-screen flex flex-col font-sans">
      
      {/* Dashboard Top Header */}
      <header className="border-b border-slate-900 bg-black/40 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 p-[1px] shadow-md shadow-indigo-500/10">
            <div className="h-full w-full bg-[#0c0c11] rounded-[7px] flex items-center justify-center">
              <Sparkles className="h-4.5 w-4.5 text-indigo-400" />
            </div>
          </div>
          <span className="font-extrabold text-md tracking-tight text-white uppercase">
            Meta Vibronics Admin
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-rose-400 px-3.5 py-2 rounded-xl bg-slate-900/50 border border-slate-800 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </button>
      </header>

      {/* Metrics Summary Cards */}
      <main className="flex-grow p-6 space-y-8 max-w-7xl mx-auto w-full">
        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Revenue */}
          <div className="glass-card rounded-2xl p-5 flex items-center justify-between relative overflow-hidden">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Revenue</span>
              <h3 className="text-2xl font-black text-white">₹{metrics.totalRevenue.toLocaleString()}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>

          {/* Card 2: Bookings */}
          <div className="glass-card rounded-2xl p-5 flex items-center justify-between relative overflow-hidden">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Bookings</span>
              <h3 className="text-2xl font-black text-white">{metrics.totalBookings}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Users className="h-5 w-5" />
            </div>
          </div>

          {/* Card 3: Today's Bookings */}
          <div className="glass-card rounded-2xl p-5 flex items-center justify-between relative overflow-hidden">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Slots</span>
              <h3 className="text-2xl font-black text-white">{metrics.todaysBookings}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Calendar className="h-5 w-5" />
            </div>
          </div>

          {/* Card 4: Upcoming Zoom */}
          <div className="glass-card rounded-2xl p-5 flex items-center justify-between relative overflow-hidden">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Upcoming Meets</span>
              <h3 className="text-2xl font-black text-white">{metrics.upcomingMeetings}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
              <Video className="h-5 w-5" />
            </div>
          </div>
        </section>

        {/* Dashboard Filters & Controls */}
        <section className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="absolute inset-y-0 left-0 pl-3.5 flex items-center h-full text-slate-600 w-4.5" />
              <input
                type="text"
                placeholder="Search phone, name, ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#0d0d12] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 text-slate-200 placeholder:text-slate-600 transition-colors"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center space-x-2 bg-[#0d0d12] border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
                <Filter className="h-3.5 w-3.5 text-slate-500" />
                <select
                  value={bookingFilter}
                  onChange={(e) => setBookingFilter(e.target.value)}
                  className="bg-transparent border-none text-slate-300 focus:outline-none text-[11px]"
                >
                  <option value="">All Bookings</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 bg-[#0d0d12] border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
                <Filter className="h-3.5 w-3.5 text-slate-500" />
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="bg-transparent border-none text-slate-300 focus:outline-none text-[11px]"
                >
                  <option value="">All Payments</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <button
                onClick={exportToCSV}
                disabled={bookings.length === 0}
                className="flex items-center space-x-2 text-xs font-semibold text-slate-300 bg-indigo-650 hover:bg-indigo-600 disabled:opacity-50 hover:text-white px-4 py-2 rounded-xl shadow-md transition-colors ml-auto md:ml-0"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Bookings Table */}
          <div className="overflow-x-auto border border-slate-900 rounded-xl bg-black/20">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-950/50 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-4">Customer</th>
                  <th className="p-4">Scheduled Time</th>
                  <th className="p-4">Payment Status</th>
                  <th className="p-4">Booking Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      <div className="inline-flex h-6 w-6 border-2 border-slate-600 border-t-transparent rounded-full animate-spin mb-2" />
                      <div>Syncing secure records...</div>
                    </td>
                  </tr>
                ) : bookings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 italic">
                      No matching records found.
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => {
                    const scheduledDate = new Date(booking.scheduledTime);
                    return (
                      <tr
                        key={booking.id}
                        onClick={() => {
                          setSelectedBooking(booking);
                          setNewTime(booking.scheduledTime.substring(0, 16)); // YYYY-MM-DDTHH:MM format for date inputs
                        }}
                        className="hover:bg-slate-900/40 cursor-pointer transition-colors"
                      >
                        <td className="p-4">
                          <div className="font-bold text-slate-200">{booking.customerName}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{booking.phone}</div>
                        </td>
                        <td className="p-4 font-semibold text-slate-300">
                          {scheduledDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })},{' '}
                          {scheduledDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              booking.paymentStatus === 'paid'
                                ? 'bg-emerald-950/30 border border-emerald-500/20 text-emerald-400'
                                : booking.paymentStatus === 'pending'
                                ? 'bg-amber-950/30 border border-amber-500/20 text-amber-400'
                                : 'bg-rose-950/30 border border-rose-500/20 text-rose-400'
                            }`}
                          >
                            {booking.paymentStatus}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              booking.bookingStatus === 'confirmed'
                                ? 'bg-indigo-950/30 border border-indigo-500/20 text-indigo-400'
                                : booking.bookingStatus === 'pending'
                                ? 'bg-amber-950/30 border border-amber-500/20 text-amber-400'
                                : 'bg-rose-950/30 border border-rose-500/20 text-rose-400'
                            }`}
                          >
                            {booking.bookingStatus}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-slate-500 hover:text-indigo-400 font-semibold inline-flex items-center space-x-1 text-[11px]">
                            <span>Details</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Slide-over Drawer / Action Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedBooking(null)}
          />

          {/* Drawer content */}
          <div className="relative w-full max-w-lg bg-[#0c0c10] border-l border-slate-900 shadow-2xl h-full flex flex-col justify-between z-10 animate-slide-in">
            
            {/* Drawer Header */}
            <div>
              <div className="p-6 border-b border-slate-900 flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-base text-white">Booking Sheet Details</h3>
                  <p className="text-[10px] font-mono text-slate-500">{selectedBooking.id}</p>
                </div>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-200px)]">
                {actionError && (
                  <div className="bg-rose-950/40 border border-rose-500/30 text-rose-200 p-3 rounded-xl text-xs">
                    {actionError}
                  </div>
                )}

                {/* Patient Summary Card */}
                <div className="bg-[#0f0f14] border border-slate-900 rounded-2xl p-5 space-y-4">
                  <h4 className="font-bold text-xs text-indigo-400 uppercase tracking-wider">Patient Summary</h4>
                  <div className="space-y-3.5 text-xs text-slate-300">
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-slate-500 w-16">Name:</span>
                      <span className="font-semibold text-slate-200">{selectedBooking.customerName}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-slate-500 w-16">Phone:</span>
                      <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
                        <Phone className="h-3.5 w-3.5 text-indigo-400" />
                        <span>{selectedBooking.phone}</span>
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-slate-500 w-16">Email:</span>
                      <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
                        <Mail className="h-3.5 w-3.5 text-indigo-400" />
                        <span>{selectedBooking.email || 'None'}</span>
                      </span>
                    </div>
                    {selectedBooking.notes && (
                      <div className="flex items-start space-x-3">
                        <span className="font-bold text-slate-500 w-16 mt-0.5">Notes:</span>
                        <p className="font-normal text-slate-400 bg-black/30 p-2.5 rounded-xl flex-grow max-h-24 overflow-y-auto leading-normal">
                          {selectedBooking.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Meeting References Card */}
                <div className="bg-[#0f0f14] border border-slate-900 rounded-2xl p-5 space-y-4">
                  <h4 className="font-bold text-xs text-indigo-400 uppercase tracking-wider">Integration Status</h4>
                  <div className="space-y-3.5 text-xs text-slate-300">
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-slate-500 w-24">Zoom ID:</span>
                      <span className="font-mono text-slate-300">{selectedBooking.zoomMeetingId || 'Not scheduled'}</span>
                    </div>
                    {selectedBooking.zoomJoinUrl && (
                      <div className="flex items-center space-x-3">
                        <span className="font-bold text-slate-500 w-24">Zoom Link:</span>
                        <a
                          href={selectedBooking.zoomJoinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 truncate"
                        >
                          <span className="truncate">Open meeting link</span>
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                      </div>
                    )}
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-slate-500 w-24">Google Event ID:</span>
                      <span className="font-mono text-slate-300 truncate">{selectedBooking.calendarEventId || 'No calendar event'}</span>
                    </div>
                  </div>
                </div>

                {/* Administrative Operations Form */}
                <div className="border-t border-slate-900 pt-5 space-y-5">
                  <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Owner Actions</h4>
                  
                  {/* Action 1: Assign Time */}
                  <div className="space-y-2.5 bg-black/20 p-4 border border-slate-900 rounded-xl">
                    <label className="block text-[11px] font-semibold text-slate-400">
                      Re-schedule / Assign Appointment Time
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="datetime-local"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        className="bg-[#0d0d12] border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-200 flex-grow"
                      />
                      <button
                        onClick={() => handleBookingAction('assign-time', { scheduledTime: new Date(newTime).toISOString() })}
                        disabled={updatingAction !== null}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 flex items-center space-x-1.5 transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>Update</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Action 2: Verify Payment */}
                    <button
                      onClick={() => handleBookingAction('verify-payment')}
                      disabled={updatingAction !== null || selectedBooking.paymentStatus === 'paid'}
                      className="px-4 py-3 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl text-xs font-bold text-emerald-400 hover:bg-emerald-950/20 disabled:opacity-40 transition-all flex items-center justify-center space-x-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Verify Payment</span>
                    </button>

                    {/* Action 3: Reassign Meet */}
                    <button
                      onClick={() => handleBookingAction('reassign-meet')}
                      disabled={updatingAction !== null}
                      className="px-4 py-3 border border-indigo-500/20 hover:border-indigo-500/40 rounded-xl text-xs font-bold text-indigo-400 hover:bg-indigo-950/20 disabled:opacity-40 transition-all flex items-center justify-center space-x-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>Reassign Meet</span>
                    </button>
                  </div>

                  {/* Action 4: Cancel Booking */}
                  {selectedBooking.bookingStatus !== 'cancelled' && (
                    <button
                      onClick={() => handleBookingAction('cancel-booking')}
                      disabled={updatingAction !== null}
                      className="w-full px-4 py-3 border border-rose-500/10 hover:border-rose-500/30 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-950/15 disabled:opacity-40 transition-all flex items-center justify-center space-x-2"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>Cancel Booking</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Footer indicator */}
            <div className="p-4 border-t border-slate-900 bg-slate-950/40 text-center text-[10px] text-slate-500 flex items-center justify-center space-x-1.5">
              <span>Verified encrypted database updates</span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
