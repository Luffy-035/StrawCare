"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Join HealthVer</h1>
          <p className="text-slate-400">Create your account to get started</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
          <SignUp
            appearance={{
              elements: {
                formButtonPrimary:
                  "bg-emerald-500 hover:bg-emerald-600 text-sm normal-case",
                card: "bg-transparent shadow-none",
                headerTitle: "text-white",
                headerSubtitle: "text-slate-400",
                socialButtonsBlockButton:
                  "border-white/20 text-white hover:bg-white/10",
                formFieldInput:
                  "bg-white/10 border-white/20 text-white placeholder:text-slate-400",
                formFieldLabel: "text-white",
                footerActionLink: "text-emerald-400 hover:text-emerald-300",
                identityPreviewText: "text-white",
                identityPreviewEditButton: "text-emerald-400",
              },
            }}
            routing="path"
            path="/sign-up"
            afterSignUpUrl="/"
          />
        </div>
      </div>
    </div>
  );
}
