"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Calendar } from "@/components/ui/calendar";
import { createAppointment } from "@/actions/appointmentActions";
import { createPaymentOrder, verifyPayment } from "@/actions/paymentActions";
import { CalendarDays, Clock, CreditCard, CheckCircle } from "lucide-react";
import { useUser } from "@clerk/nextjs";

function BookAppointmentModal({ doctor, isOpen, onClose, onViewAppointments }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentStep, setPaymentStep] = useState("booking");
  const [isShowing, setIsShowing] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  const {user} = useUser();

  // --- Logic remains unchanged ---
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const isDateAvailable = useCallback(
    (date) => {
      if (!doctor.availability) return false;
      const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
      return doctor.availability.some(
        (avail) => avail.day === dayName && avail.slots.length > 0
      );
    },
    [doctor.availability]
  );

  const getAvailableSlots = useCallback(() => {
    if (!selectedDate || !doctor.availability) return [];
    const dayName = selectedDate.toLocaleDateString("en-US", {
      weekday: "long",
    });
    const availability = doctor.availability.find(
      (avail) => avail.day === dayName
    );
    return availability?.slots || [];
  }, [selectedDate, doctor.availability]);

  const handleClose = useCallback(() => {
    setSelectedDate(null);
    setSelectedSlot("");
    setReason("");
    setPaymentStep("booking");
    setLoading(false);
    onClose();
  }, [onClose]);

  const handleViewAppointment = useCallback(() => {
    // Check if current page is /chatbot, then redirect to /patient with tab switch
    if (pathname === "/chatbot") {
      router.push("/patient?tab=my-appointments");
    } else if (onViewAppointments) {
      // If we're already on patient page, use the callback to switch tabs
      onViewAppointments();
    } else {
      // Fallback: navigate to patient page with tab parameter
      router.push("/patient?tab=my-appointments");
    }
  }, [pathname, router, onViewAppointments]);

  const isDateDisabled = useCallback(
    (date) => {
      return date < today || !isDateAvailable(date);
    },
    [today, isDateAvailable]
  );

  const handlePayment = useCallback(async () => {
    if (!selectedDate || !selectedSlot) {
      alert("Please select date and time slot");
      return;
    }
    if (!window.Razorpay) {
      alert("Payment system is loading. Please try again.");
      return;
    }
    setLoading(true);
    try {
      const orderData = await createPaymentOrder(doctor._id);
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "HealthCare Connect",
        description: `Consultation with ${doctor.name}`,
        order_id: orderData.orderId,
        handler: async function (response) {
          try {
            const verificationResult = await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (verificationResult.success) {
              const appointmentDateTime = new Date(selectedDate);
              const [hours, minutes] = selectedSlot.split(":");
              appointmentDateTime.setHours(parseInt(hours), parseInt(minutes));
              await createAppointment({
                doctorId: doctor._id,
                appointmentDate: appointmentDateTime.toISOString(),
                reason,
                paymentId: verificationResult.paymentId,
              },user.id);
              setPaymentStep("success");
            }
          } catch (error) {
            console.error("Payment verification error:", error);
            
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: "Patient",
          email: "patient@example.com",
          contact: "9999999999",
        },
        theme: {
          color: "#10b981",
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      };
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error("Payment initiation failed:", error);
      setLoading(false);
    }
  }, [selectedDate, selectedSlot, doctor._id, doctor.name, reason]);

  useEffect(() => {
    const loadRazorpay = () => {
      if (window.Razorpay) return;
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      document.head.appendChild(script);
    };
    if (isOpen) {
      loadRazorpay();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setIsShowing(true);
    } else {
      const timer = setTimeout(() => setIsShowing(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isShowing) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${
        isOpen ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        onClick={handleClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300"
      ></div>

      {/* ✅ THEME: Using zinc-900 for the modal background */}
      <div
        className={`custom-scrollbar relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-900 border border-zinc-800/80 rounded-2xl shadow-2xl p-8 transition-all duration-300 ${
          isOpen
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-4"
        }`}
      >
        {paymentStep === "success" ? (
          <div className="text-center space-y-6">
            <div className="mx-auto p-4 bg-emerald-500/10 rounded-full w-fit border border-emerald-400/30">
              <CheckCircle className="h-10 w-10 text-emerald-400" />
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-bold text-white">
                Appointment Booked!
              </h3>
              <p className="text-zinc-300 text-lg">
                Your appointment with {doctor.name} has been successfully
                booked.
              </p>
            </div>
            <button
              onClick={handleViewAppointment}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold border border-emerald-500 shadow-lg hover:shadow-emerald-500/20 py-4 text-lg rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-zinc-900"
            >
              View My Appointments
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">
                Book Appointment
              </h2>
              <p className="text-zinc-400 text-lg mt-1">
                Schedule an appointment with {doctor.name}
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700/60">
                <h3 className="font-semibold text-lg text-white">
                  {doctor.name}
                </h3>
                <p className="text-emerald-400">{doctor.specialization}</p>
                <div className="flex items-center space-x-4 mt-2 text-sm text-zinc-300">
                  <span>₹{doctor.consultationFee}</span>
                  <span className="bg-zinc-700 text-zinc-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                    {doctor.category}
                  </span>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-base font-semibold text-zinc-200 mb-3 block">
                    <CalendarDays className="h-4 w-4 inline mr-2" />
                    Select Date
                  </label>
                  {/* ✅ THEME: Updated Calendar theme with zinc colors */}
                  <div
                    className="bg-zinc-800/50 text-white rounded-lg border border-zinc-700/60 p-4"
                    style={{
                      "--radius": "0.5rem",
                      "--background": "transparent",
                      "--foreground": "hsl(240 5% 96%)", // zinc-100
                      "--primary": "hsl(160, 100%, 30%)", // A darker emerald
                      "--primary-foreground": "hsl(240 5% 96%)", // zinc-100
                      "--accent": "hsl(240 4% 26%)", // zinc-800
                      "--accent-foreground": "hsl(240 5% 96%)", // zinc-100
                      "--border": "hsl(240 5% 34%)", // zinc-700
                      "--ring": "hsl(160, 100%, 40%)", // Brighter emerald
                      "--rdp-cell-size": "52px",
                      "--rdp-caption-end": "1rem",
                    }}
                  >
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={isDateDisabled}
                      className="w-full"
                    />
                  </div>
                </div>

                {selectedDate && (
                  <div>
                    <label className="text-base font-semibold text-zinc-200 mb-3 block">
                      <Clock className="h-4 w-4 inline mr-2" />
                      Available Time Slots
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {getAvailableSlots().map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`px-2 py-2 text-sm font-semibold rounded-md transition-all border ${
                            selectedSlot === slot
                              ? "bg-emerald-600 text-white border-emerald-500 shadow"
                              : "bg-zinc-800 text-zinc-200 border-zinc-700 hover:border-emerald-600/50 hover:text-white"
                          } focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                    {getAvailableSlots().length === 0 && (
                      <p className="text-zinc-500 text-sm mt-2">
                        No slots available for this day.
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="reason"
                    className="text-base font-semibold text-zinc-200 mb-2 block"
                  >
                    Reason for Visit (Optional)
                  </label>
                  <textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Brief description of your symptoms..."
                    rows={3}
                    className="w-full bg-zinc-800/50 border-zinc-700/80 text-zinc-200 rounded-md focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 placeholder-zinc-500 text-base p-2 transition-colors"
                  />
                </div>

                {selectedDate && selectedSlot && (
                  <div className="bg-emerald-500/10 p-4 rounded-lg border border-emerald-400/20">
                    <h4 className="font-semibold mb-2 text-white">
                      Appointment Summary
                    </h4>
                    <div className="space-y-2 text-sm text-zinc-300">
                      <div className="flex justify-between">
                        <span>Date:</span>
                        <span>{selectedDate.toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Time:</span>
                        <span>{selectedSlot}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-emerald-300">
                        <span>Consultation Fee:</span>
                        <span>₹{doctor.consultationFee}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex space-x-4 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full bg-zinc-700/70 hover:bg-zinc-700 text-zinc-200 font-bold border border-zinc-600/80 py-3 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-zinc-900"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePayment}
                    disabled={loading || !selectedDate || !selectedSlot}
                    className="w-full flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white font-bold border border-emerald-500 shadow-lg hover:shadow-emerald-500/20 py-3 rounded-lg transition-all disabled:bg-zinc-700 disabled:cursor-not-allowed disabled:shadow-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {loading
                      ? "Processing..."
                      : `Pay ₹${doctor.consultationFee} & Book`}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default memo(BookAppointmentModal);
