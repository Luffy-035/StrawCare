"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Clock, User, MessageCircle } from "lucide-react";
import { useState, useEffect } from "react";
import {
  getDoctorAppointments,
  updateAppointmentStatus,
} from "@/actions/appointmentActions";
import ChatModal from "./ChatModal";
import { AlertCircle } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
export default function DoctorDashboard({ doctor }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingAppointment, setUpdatingAppointment] = useState(null);

  // Chat states
  const [selectedAppointmentForChat, setSelectedAppointmentForChat] =
    useState(null);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);

  useEffect(() => {
    if (doctor.status === "approved") {
      fetchAppointments();
    }
  }, [doctor.status]);

  const fetchAppointments = async () => {
    try {
      const data = await getDoctorAppointments();
      // Store original notes to compare onBlur
      setAppointments(
        data.map((apt) => ({ ...apt, originalNotes: apt.notes || "" }))
      );
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (appointmentId, status, notes = "") => {
    setUpdatingAppointment(appointmentId);
    try {
      await updateAppointmentStatus(appointmentId, status, notes);
      await fetchAppointments();
    } catch (error) {
      console.error("Error updating appointment:", error);
    } finally {
      setUpdatingAppointment(null);
    }
  };

  const handleOpenChat = (appointment) => {
    setSelectedAppointmentForChat(appointment);
    setIsChatModalOpen(true);
  };

  const getAppointmentStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-400/20";
      case "confirmed":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-400/20";
      case "completed":
        return "bg-blue-500/10 text-blue-400 border-blue-400/20";
      case "cancelled":
        return "bg-red-500/10 text-red-400 border-red-400/20";
      default:
        return "bg-zinc-700/20 text-zinc-400 border-zinc-600/40";
    }
  };

  const todayAppointments = appointments.filter((apt) => {
    const today = new Date().toDateString();
    return new Date(apt.appointmentDate).toDateString() === today;
  });

  return (
    <div className="min-h-screen bg-black p-6 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900/50 to-black"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Doctor Dashboard</h1>
            <p className="text-zinc-400 mt-1">Welcome back, {doctor.name}</p>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>

        {doctor.status === "approved" ? (
          <Tabs defaultValue="appointments" className="space-y-8">
            <div className="backdrop-blur-xl bg-zinc-900/50 border border-zinc-800 rounded-2xl p-3 shadow-2xl">
              <TabsList className="grid w-full grid-cols-2 bg-transparent gap-3 h-auto">
                <TabsTrigger
                  value="appointments"
                  className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:border-emerald-500 data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/20 text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-all duration-300 border border-zinc-800 rounded-xl py-4 px-6 font-medium bg-zinc-900/70 text-lg"
                >
                  Appointments
                </TabsTrigger>
                <TabsTrigger
                  value="profile"
                  className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:border-emerald-500 data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/20 text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-all duration-300 border border-zinc-800 rounded-xl py-4 px-6 font-medium bg-zinc-900/70 text-lg"
                >
                  Profile
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="appointments" className="space-y-8">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="backdrop-blur-xl bg-zinc-900/30 border border-zinc-800/60 shadow-2xl rounded-2xl">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-white flex items-center space-x-3">
                      <Calendar className="h-6 w-6 text-emerald-400" />
                      <span>Today's Appointments</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-emerald-300">
                      {todayAppointments.length}
                    </div>
                    <p className="text-md text-zinc-400">
                      {todayAppointments.length === 0
                        ? "No appointments today"
                        : "scheduled for today"}
                    </p>
                  </CardContent>
                </Card>
                <Card className="backdrop-blur-xl bg-zinc-900/30 border border-zinc-800/60 shadow-2xl rounded-2xl">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-white flex items-center space-x-3">
                      <User className="h-6 w-6 text-emerald-400" />
                      <span>Total Appointments</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-emerald-300">
                      {appointments.length}
                    </div>
                    <p className="text-md text-zinc-400">All time</p>
                  </CardContent>
                </Card>
                <Card className="backdrop-blur-xl bg-zinc-900/30 border border-zinc-800/60 shadow-2xl rounded-2xl">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-white flex items-center space-x-3">
                      <Clock className="h-6 w-6 text-emerald-400" />
                      <span>Pending Requests</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-emerald-300">
                      {
                        appointments.filter((apt) => apt.status === "pending")
                          .length
                      }
                    </div>
                    <p className="text-md text-zinc-400">
                      Awaiting confirmation
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Appointments List */}
              <Card className="backdrop-blur-xl bg-zinc-900/30 border border-zinc-800/60 shadow-2xl rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-white">All Appointments</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Manage your patient appointments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-12 text-zinc-400">
                      Loading appointments...
                    </div>
                  ) : appointments.length > 0 ? (
                    <div className="space-y-6">
                      {appointments.map((appointment) => (
                        <div
                          key={appointment._id}
                          className="backdrop-blur-xl bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-6 space-y-6"
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-3">
                              <div className="flex items-center space-x-3">
                                <User className="h-5 w-5 text-zinc-400" />
                                <span className="font-medium text-white">
                                  {appointment.patient?.name ||
                                    "Patient not available"}
                                </span>
                                <Badge
                                  className={`${getAppointmentStatusColor(
                                    appointment.status
                                  )} backdrop-blur-sm border`}
                                >
                                  {appointment.status}
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-4 text-md text-zinc-400">
                                <div className="flex items-center">
                                  <Calendar className="h-5 w-5 mr-2 text-emerald-400" />
                                  <span>
                                    {new Date(
                                      appointment.appointmentDate
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="flex items-center">
                                  <Clock className="h-5 w-5 mr-2 text-emerald-400" />
                                  <span>
                                    {new Date(
                                      appointment.appointmentDate
                                    ).toLocaleTimeString("en-US", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                              </div>
                              {appointment.reason && (
                                <p className="text-md text-zinc-300">
                                  <span className="font-medium">Reason: </span>
                                  {appointment.reason}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                            <Select
                              value={appointment.status}
                              onValueChange={(value) =>
                                handleStatusUpdate(
                                  appointment._id,
                                  value,
                                  appointment.notes
                                )
                              }
                              disabled={updatingAppointment === appointment._id}
                            >
                              <SelectTrigger className="w-full md:w-48 bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">
                                <SelectValue className="text-white" />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                                <SelectItem
                                  value="pending"
                                  className="hover:bg-zinc-800 focus:bg-zinc-800"
                                >
                                  Pending
                                </SelectItem>
                                <SelectItem
                                  value="confirmed"
                                  className="hover:bg-zinc-800 focus:bg-zinc-800"
                                >
                                  Confirmed
                                </SelectItem>
                                <SelectItem
                                  value="completed"
                                  className="hover:bg-zinc-800 focus:bg-zinc-800"
                                >
                                  Completed
                                </SelectItem>
                                <SelectItem
                                  value="cancelled"
                                  className="hover:bg-zinc-800 focus:bg-zinc-800"
                                >
                                  Cancelled
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            {appointment.status === "confirmed" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenChat(appointment)}
                                className="bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700 hover:border-emerald-500 h-10 px-4"
                              >
                                <MessageCircle className="h-5 w-5 mr-2" />
                                Chat
                              </Button>
                            )}
                            <div className="flex-1 w-full">
                              <Textarea
                                placeholder="Add notes for this appointment..."
                                value={appointment.notes || ""}
                                onChange={(e) => {
                                  setAppointments((prev) =>
                                    prev.map((apt) =>
                                      apt._id === appointment._id
                                        ? { ...apt, notes: e.target.value }
                                        : apt
                                    )
                                  );
                                }}
                                onBlur={(e) => {
                                  if (
                                    e.target.value !== appointment.originalNotes
                                  ) {
                                    handleStatusUpdate(
                                      appointment._id,
                                      appointment.status,
                                      e.target.value
                                    );
                                  }
                                }}
                                rows={3}
                                className="bg-zinc-800/80 border-zinc-700 text-white focus:border-emerald-500/50 focus:ring-emerald-500/20 placeholder-zinc-500 text-md h-24"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Calendar className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-zinc-400 mb-2">
                        No Appointments Yet
                      </h3>
                      <p className="text-zinc-500">
                        Patients will be able to book appointments with you once
                        your profile is approved.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="profile" className="space-y-8">
              <Card className="backdrop-blur-xl bg-zinc-900/30 border border-zinc-800/60 shadow-2xl rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-3">
                    <User className="h-6 w-6 text-emerald-400" />
                    <span>Profile Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-md font-medium text-zinc-400">
                        Specialization
                      </label>
                      <p className="text-xl text-white mt-1">
                        {doctor.specialization}
                      </p>
                    </div>
                    <div>
                      <label className="text-md font-medium text-zinc-400">
                        Category
                      </label>
                      <p className="text-xl text-white mt-1">
                        {doctor.category}
                      </p>
                    </div>
                    <div>
                      <label className="text-md font-medium text-zinc-400">
                        Experience
                      </label>
                      <p className="text-xl text-white mt-1">
                        {doctor.experience} years
                      </p>
                    </div>
                    <div>
                      <label className="text-md font-medium text-zinc-400">
                        Consultation Fee
                      </label>
                      <p className="text-xl text-white mt-1 flex items-center">
                        ₹{doctor.consultationFee}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="text-md font-medium text-zinc-400">
                      Qualifications
                    </label>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {doctor.qualifications?.map((qual, index) => (
                        <Badge
                          key={index}
                          className="bg-zinc-800 text-white border-zinc-700 text-md"
                        >
                          {qual}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-md font-medium text-zinc-400">
                      Availability
                    </label>
                    <div className="mt-3 space-y-4">
                      {doctor.availability?.map((avail, index) => (
                        <div key={index} className="flex items-start space-x-4">
                          <Calendar className="h-6 w-6 text-emerald-400 mt-1" />
                          <div>
                            <span className="font-medium text-white text-lg">
                              {avail.day}:
                            </span>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {avail.slots?.map((slot, slotIndex) => (
                                <Badge
                                  key={slotIndex}
                                  className="bg-zinc-800 text-white border-zinc-700 text-sm"
                                >
                                  {slot}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <Card className="backdrop-blur-xl bg-zinc-900/30 border border-zinc-800/60 shadow-2xl rounded-2xl">
            <CardContent className="text-center py-12">
              <div className="mx-auto p-4 bg-yellow-500/10 rounded-full w-fit border border-yellow-400/20 mb-4">
                <AlertCircle className="h-12 w-12 text-yellow-400" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-3">
                Profile Under Review
              </h3>
              <p className="text-zinc-300 text-lg mb-6">
                Thank you for submitting your profile. Our team is reviewing
                your application and will notify you once it's approved.
              </p>
              <Button
                variant="outline"
                className="bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700 hover:border-emerald-500 px-8 py-3 text-md"
              >
                Contact Support
              </Button>
            </CardContent>
          </Card>
        )}

        {selectedAppointmentForChat && (
          <ChatModal
            appointment={selectedAppointmentForChat}
            isOpen={isChatModalOpen}
            onClose={() => {
              setIsChatModalOpen(false);
              setSelectedAppointmentForChat(null);
            }}
          />
        )}
      </div>
    </div>
  );
}