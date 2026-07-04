import Link from "next/link";
import { PoplanLogo } from "@/components/PoplanLogo";

export default function BrandLoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-nude-50 px-6">
      <div className="w-full max-w-sm text-center">
        <PoplanLogo />
        <p className="mt-6 text-sm text-brown-600">Brand manager login coming soon</p>
        <Link
          href="/"
          className="mt-8 inline-block text-sm font-medium text-brown-600 underline-offset-4 hover:underline"
        >
          ← Back
        </Link>
      </div>
    </main>
  );
}
