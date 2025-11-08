import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import DoctorOnboarding from "@/components/DoctorOnboarding";
import { AlertCircle } from "lucide-react";
export default async function DoctorOnboardingPage() {
  const { userId, sessionClaims } = await auth();
  
  if (!userId) {
    redirect('/');
  }

  // Check if user has doctor role
  if (sessionClaims?.role?.role !== 'doctor') {
    redirect('/');
  }

  return <DoctorOnboarding />;
}
