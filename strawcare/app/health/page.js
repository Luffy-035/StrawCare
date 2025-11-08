import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import connectDB from "@/lib/db";
import Patient from "@/models/Patient";
import HealthScoreDashboard from "@/components/HealthScoreDashboard";

export default async function HealthPage() {
  const { userId, sessionClaims } = await auth();
  
  if (!userId) {
    console.log("TEST1")
    redirect('/');
  }

  // Only patients can access health score
  if (sessionClaims?.role?.role !== 'patient') {
        console.log("TEST2")

    redirect('/');
  }

  await connectDB();
  const patient = await Patient.findOne({ userId }).lean();

  if (!patient) {
    redirect('/patient');
  }

  return <HealthScoreDashboard patient={JSON.parse(JSON.stringify(patient))} />;
}
