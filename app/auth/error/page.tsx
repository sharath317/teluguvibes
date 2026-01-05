import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-8">
          <div className="flex justify-center mb-6">
            <div className="bg-red-500/20 p-4 rounded-full">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">
            Authentication Error
          </h1>
          <p className="text-[#737373] mb-8">
            There was an error signing you in. This could be because:
          </p>

          <ul className="text-left text-sm text-[#737373] mb-8 space-y-2">
            <li>• Your email is not authorized for admin access</li>
            <li>• The sign-in process was cancelled</li>
            <li>• There was a problem with the authentication provider</li>
          </ul>

          <div className="space-y-4">
            <Link
              href="/auth/signin"
              className="block w-full px-4 py-3 bg-[#eab308] text-black font-bold rounded-lg hover:bg-[#ca9a06] transition-colors"
            >
              Try Again
            </Link>
            <Link
              href="/"
              className="block w-full px-4 py-3 bg-[#262626] text-white rounded-lg hover:bg-[#363636] transition-colors"
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}








