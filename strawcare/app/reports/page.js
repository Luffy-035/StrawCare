import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import PDFUploader from "@/components/PDFUploader";

export default async function ReportsPage() {
  const { userId, sessionClaims } = await auth();
  
  if (!userId) {
    redirect('/');
  }

  // Only patients can access reports
  if (sessionClaims?.role?.role !== 'patient') {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Medical Reports</h1>
          <p className="text-gray-600 mt-2">Upload and analyze your medical reports with AI</p>
        </div>
        
        <PDFUploader />
      </div>
    </div>
  );
}
