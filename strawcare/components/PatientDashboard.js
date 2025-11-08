"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Calendar,
    Star,
    Clock,
    User,
    CreditCard,
    MessageCircle,
    Activity,
    Heart,
    Brain,
    Shield,
    Eye,
    Zap,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import BookAppointmentModal from "./BookAppointmentModal";
import ChatModal from "./ChatModal";
import { getPatientAppointments } from "@/actions/appointmentActions";
import { UserButton } from "@clerk/nextjs";

// Sub-component for the dashboard header
const DashboardHeader = () => (
    <div className="mb-10 bg-[#16201D] border border-zinc-800 rounded-3xl p-6 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex items-start space-x-4">
                <div className="p-3 bg-gradient-to-br from-[#10D582] to-[#069C67] rounded-xl flex-shrink-0">
                    <Zap className="h-7 w-7 text-black" />
                </div>
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white">
                        Patient Dashboard
                    </h1>
                    <p className="text-zinc-400 mt-1 text-base">
                        Manage your healthcare with AI-powered insights
                    </p>
                </div>
            </div>
            <div className="flex items-center flex-wrap gap-3 md:gap-4">
                <Link
                    href="/health"
                    className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-zinc-200 bg-zinc-800/70 border border-zinc-700 rounded-xl hover:bg-zinc-800 hover:text-white transition-colors"
                >
                    <Heart className="h-4 w-4 mr-2" style={{ color: "#10D582" }} />
                    <span>Health Score</span>
                </Link>
                <Link
                    href="/chatbot"
                    className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-zinc-200 bg-zinc-800/70 border border-zinc-700 rounded-xl hover:bg-zinc-800 hover:text-white transition-colors"
                >
                    <MessageCircle className="h-4 w-4 mr-2" style={{ color: "#10D582" }} />
                    <span>AI Assistant</span>
                </Link>
                <UserButton afterSignOutUrl="/" />
            </div>
        </div>
    </div>
);

// Sub-component for doctor category filters
const CategoryFilters = ({ categories, selectedCategory, setSelectedCategory }) => {
    const getCategoryIcon = (category) => {
        switch (category.toLowerCase()) {
            case "cardiology": return <Heart className="h-4 w-4" />;
            case "neurology": return <Brain className="h-4 w-4" />;
            case "dermatology": return <Shield className="h-4 w-4" />;
            case "ophthalmology": return <Eye className="h-4 w-4" />;
            case "general":
            default: return <Activity className="h-4 w-4" />;
        }
    };

    return (
        <div className="backdrop-blur-xl bg-zinc-900/30 border border-zinc-800/60 shadow-2xl rounded-2xl p-6">
            <h2 className="text-white flex items-center space-x-2 text-xl font-semibold mb-4">
                <Shield className="h-5 w-5 text-emerald-400" />
                <span>Filter by Specialization</span>
            </h2>
            <div className="flex flex-wrap gap-3">
                {categories.map((category) => (
                    <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`capitalize transition-all duration-300 rounded-xl px-4 py-2 md:px-5 md:py-2 font-medium border text-sm md:text-base flex items-center space-x-2 ${selectedCategory === category
                                ? "bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-500/20"
                                : "bg-zinc-800/70 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-700"
                            }`}
                    >
                        {category !== "all" && getCategoryIcon(category)}
                        <span>{category === "all" ? "All Doctors" : category}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

// Sub-component for displaying a single doctor card
const DoctorCard = ({ doctor, onBookAppointment }) => (
    <div className="group backdrop-blur-xl bg-zinc-900/30 border border-zinc-800/60 hover:border-emerald-500/40 shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 rounded-2xl flex flex-col">
        <div className="p-6">
            <h2 className="text-xl font-semibold text-white group-hover:text-emerald-300 transition-colors">
                {doctor.name}
            </h2>
            <p className="font-medium text-emerald-400">{doctor.specialization}</p>
        </div>
        <div className="px-6 pb-6 space-y-4 flex-grow flex flex-col">
            <div className="flex items-center text-sm text-zinc-400 space-x-4">
                <span className="flex items-center"><Star className="h-4 w-4 mr-1.5 text-emerald-400" /> {doctor.experience} years exp</span>
                <span className="flex items-center">₹{doctor.consultationFee}</span>
            </div>
            {doctor.qualifications?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {doctor.qualifications.slice(0, 2).map((qual, index) => (
                        <span key={index} className="text-xs bg-zinc-800 text-zinc-300 border-zinc-700 font-semibold px-2.5 py-1 rounded-full">
                            {qual}
                        </span>
                    ))}
                    {doctor.qualifications.length > 2 && (
                        <span className="text-xs bg-zinc-800 text-zinc-300 border-zinc-700 font-semibold px-2.5 py-1 rounded-full">
                            +{doctor.qualifications.length - 2} more
                        </span>
                    )}
                </div>
            )}
            <button
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl py-3 mt-auto inline-flex items-center justify-center transition-all transform hover:scale-105"
                onClick={() => onBookAppointment(doctor)}
            >
                <Calendar className="h-5 w-5 mr-2" />
                Book Appointment
            </button>
        </div>
    </div>
);

// Sub-component for a single appointment card
const AppointmentCard = ({ appointment, onOpenChat }) => {
    const getStatusColor = (status) => {
        switch (status) {
            case "pending": return "bg-yellow-500/10 text-yellow-400 border-yellow-400/20";
            case "confirmed": return "bg-emerald-500/10 text-emerald-400 border-emerald-400/20";
            case "completed": return "bg-blue-500/10 text-blue-400 border-blue-400/20";
            case "cancelled": return "bg-red-500/10 text-red-400 border-red-400/20";
            default: return "bg-zinc-700/20 text-zinc-400 border-zinc-500/40";
        }
    };

    return (
        <div className="backdrop-blur-xl bg-zinc-900/30 border border-zinc-800/60 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-white">{appointment.doctor?.name || "N/A"}</h2>
                    <p className="text-emerald-400 text-sm">{appointment.doctor?.specialization || "N/A"}</p>
                </div>
                <span className={`${getStatusColor(appointment.status)} backdrop-blur-sm border font-medium text-xs px-2.5 py-1 rounded-full self-start`}>
                    {appointment.status}
                </span>
            </div>

            <div className="border-t border-zinc-800 pt-4 space-y-3 text-sm text-zinc-400">
                <div className="flex items-center"><Calendar className="h-4 w-4 mr-3 text-emerald-400" />{new Date(appointment.appointmentDate).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</div>
                {appointment.paymentId && <div className="flex items-center"><CreditCard className="h-4 w-4 mr-3 text-emerald-400" />Paid: ₹{appointment.amount}</div>}
            </div>

            {appointment.reason && <p className="text-sm bg-zinc-800/70 rounded-xl p-3"><span className="font-medium text-zinc-300">Reason: </span><span className="text-zinc-400">{appointment.reason}</span></p>}
            {appointment.notes && <p className="text-sm bg-zinc-800/70 rounded-xl p-3"><span className="font-medium text-zinc-300">Doctor's Notes: </span><span className="text-zinc-400">{appointment.notes}</span></p>}

            {appointment.status === "confirmed" && (
                <button
                    onClick={() => onOpenChat(appointment)}
                    className="w-full bg-zinc-800/70 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 hover:border-emerald-600 transition-all rounded-xl h-10 px-3 inline-flex items-center justify-center text-sm mt-2"
                >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Chat with Doctor
                </button>
            )}
        </div>
    );
};

// Main Dashboard Component
export default function PatientDashboard({ doctors }) {
    const searchParams = useSearchParams();
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAppointmentForChat, setSelectedAppointmentForChat] = useState(null);
    const [isChatModalOpen, setIsChatModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("find-doctors");

    useEffect(() => {
        fetchAppointments();
        const tabParam = searchParams.get("tab");
        if (tabParam === "my-appointments") {
            setActiveTab("my-appointments");
        }
    }, [searchParams]);

    const fetchAppointments = async () => {
        setLoading(true);
        try {
            const data = await getPatientAppointments();
            setAppointments(data);
        } catch (error) {
            console.error("Error fetching appointments:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleBookAppointment = (doctor) => {
        setSelectedDoctor(doctor);
        setIsBookingModalOpen(true);
    };

    const handleOpenChat = (appointment) => {
        setSelectedAppointmentForChat(appointment);
        setIsChatModalOpen(true);
    };

    const doctorsByCategory = doctors.reduce((acc, doctor) => {
        acc[doctor.category] = acc[doctor.category] || [];
        acc[doctor.category].push(doctor);
        return acc;
    }, {});

    const categories = ["all", ...Object.keys(doctorsByCategory)];
    const filteredDoctors = selectedCategory === "all" ? doctors : doctorsByCategory[selectedCategory] || [];

    return (
        <div className="min-h-screen bg-black p-4 md:p-8">
            <main className="max-w-7xl mx-auto">
                <DashboardHeader />

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                    <div className="backdrop-blur-xl bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-2 md:p-3 shadow-2xl">
                        <TabsList className="grid w-full grid-cols-2 bg-transparent gap-2 md:gap-3 h-auto">
                            <TabsTrigger value="find-doctors" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/20 text-zinc-400 hover:text-white rounded-xl py-3 px-2 md:py-4 md:px-6 font-medium text-sm md:text-base">
                                <Calendar className="h-5 w-5 mr-2" /> Find Doctors
                            </TabsTrigger>
                            <TabsTrigger value="my-appointments" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/20 text-zinc-400 hover:text-white rounded-xl py-3 px-2 md:py-4 md:px-6 font-medium text-sm md:text-base">
                                <User className="h-5 w-5 mr-2" /> My Appointments
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="find-doctors" className="space-y-8">
                        <CategoryFilters categories={categories} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredDoctors.length > 0 ? (
                                filteredDoctors.map((doctor) => (
                                    <DoctorCard key={doctor._id} doctor={doctor} onBookAppointment={handleBookAppointment} />
                                ))
                            ) : (
                                <p className="col-span-full text-center text-zinc-400 py-12">No doctors found for this category.</p>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="my-appointments" className="space-y-8">
                        {loading ? (
                            <p className="text-center text-zinc-400 py-12">Loading appointments...</p>
                        ) : appointments.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {appointments.map((appointment) => (
                                    <AppointmentCard key={appointment._id} appointment={appointment} onOpenChat={handleOpenChat} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16">
                                <User className="h-16 w-16 text-zinc-500 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-zinc-200">No Appointments Yet</h3>
                                <p className="text-zinc-400 mb-6">Book your first appointment to see it here.</p>
                                <button onClick={() => setActiveTab("find-doctors")} className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl px-6 py-2.5">Find Doctors</button>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                {selectedDoctor && (
                    <BookAppointmentModal
                        doctor={selectedDoctor}
                        isOpen={isBookingModalOpen}
                        onClose={() => {
                            setIsBookingModalOpen(false);
                            setSelectedDoctor(null);
                            fetchAppointments();
                        }}
                        onViewAppointments={() => {
                            setActiveTab("my-appointments");
                            setIsBookingModalOpen(false);
                            setSelectedDoctor(null);
                        }}
                    />
                )}
                {selectedAppointmentForChat && (
                    <ChatModal
                        appointment={selectedAppointmentForChat}
                        isOpen={isChatModalOpen}
                        onClose={() => setIsChatModalOpen(false)}
                    />
                )}
            </main>
        </div>
    );
}