import { ReactNode } from "react";
import { Link } from "wouter";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center shadow-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 2v7.31" />
              <path d="M14 9.3V1.99" />
              <path d="M8.5 2h7" />
              <path d="M14 9.3a6.5 6.5 0 1 1-4 0" />
              <path d="M5.52 16h12.96" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            MilkSys
          </h1>
          <p className="text-sm text-muted-foreground">
            Trusted ledger for dairy farming
          </p>
        </div>
        <div className="bg-card border border-card-border p-6 rounded-2xl shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
