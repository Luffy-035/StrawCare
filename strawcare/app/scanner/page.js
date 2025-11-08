"use client";

import { useEffect, useState } from "react";

export default function ScannerPage() {
  const [scannerUrl, setScannerUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SCANNER_URL;

    if (url) {
      // Add ngrok-skip-browser-warning parameter if using ngrok
      const parsedUrl = new URL(url);
      if (parsedUrl.hostname.includes("ngrok")) {
        parsedUrl.searchParams.set("ngrok-skip-browser-warning", "true");
        setScannerUrl(parsedUrl.toString());
      } else {
        setScannerUrl(url);
      }
    } else {
      setError("Scanner URL not configured");
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading scanner...</p>
        </div>
      </div>
    );
  }
  return (
    <iframe
      src={scannerUrl}
      style={{ width: "100vw", height: "100vh", border: "none" }}
      title="Scanner Application"
    ></iframe>
  );
}
