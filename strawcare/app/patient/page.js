import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import connectDB from "@/lib/db";
import Doctor from "@/models/Doctor";
import PatientDashboard from "@/components/PatientDashboard";

export default async function PatientPage() {
  const { userId, sessionClaims } = await auth();
  console.log("User id: ",userId,"Sessionclaims: ",sessionClaims)
  
  if (!userId) {
    redirect('/');
  }

  // Check if user has patient role
  if (sessionClaims?.role?.role !== 'patient') {
    redirect('/');
  }

  await connectDB();
  const doctors = await Doctor.find({ status: 'approved' }).lean();

  return <PatientDashboard doctors={JSON.parse(JSON.stringify(doctors))} />;
}
