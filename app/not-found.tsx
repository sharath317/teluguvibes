import Link from 'next/link';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-8xl font-bold text-[#eab308] mb-4">404</h1>
        <h2 className="text-2xl font-bold text-white mb-4">
          పేజీ కనుగొనబడలేదు
        </h2>
        <p className="text-[#737373] mb-8 max-w-md mx-auto">
          మీరు వెతుకుతున్న పేజీ లేదు లేదా తొలగించబడింది. దయచేసి హోమ్‌పేజీకి తిరిగి వెళ్ళండి.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#eab308] text-black font-bold rounded-lg hover:bg-[#ca9a06] transition-colors"
          >
            <Home className="w-5 h-5" />
            హోమ్‌పేజీ
          </Link>
          <Link
            href="/category/trending"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#262626] text-white rounded-lg hover:bg-[#363636] transition-colors"
          >
            <Search className="w-5 h-5" />
            ట్రెండింగ్ వార్తలు
          </Link>
        </div>
      </div>
    </div>
  );
}
