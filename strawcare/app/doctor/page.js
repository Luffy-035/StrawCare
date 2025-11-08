import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import connectDB from "@/lib/db";
import Doctor from "@/models/Doctor";
import DoctorDashboard from "@/components/DoctorDashboard";
import { AlertCircle } from "lucide-react";

export default async function DoctorPage() {
  const { userId, sessionClaims } = await auth();
  
  if (!userId) {
    redirect('/');
  }

  // Check if user has doctor role
  if (sessionClaims?.role?.role !== 'doctor') {
    redirect('/');
  }

  await connectDB();
  const doctor = await Doctor.findOne({ userId }).lean();

  if (!doctor) {
    redirect('/doctor/onboarding');
  }

  return <DoctorDashboard doctor={JSON.parse(JSON.stringify(doctor))} />;
}
