import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth, signOut } from '@/lib/auth';
import {
  LayoutDashboard,
  FileText,
  TrendingUp,
  LogOut,
  Settings
} from 'lucide-react';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Admin Header */}
      <header className="bg-[#141414] border-b border-[#262626] sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-xl font-bold text-[#eab308]">
              Admin Dashboard
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-[#737373]">
              {session.user.email}
            </span>
            <form
              action={async () => {
                'use server';
                await signOut({ redirectTo: '/' });
              }}
            >
              <button
                type="submit"
                className="flex items-center gap-2 px-3 py-2 text-sm text-[#737373] hover:text-white hover:bg-[#262626] rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-[#141414] border-r border-[#262626] min-h-[calc(100vh-64px)] p-4">
          <nav className="space-y-2">
            <NavItem href="/admin" icon={LayoutDashboard}>
              Dashboard
            </NavItem>
            <NavItem href="/admin/posts" icon={FileText}>
              Posts
            </NavItem>
            <NavItem href="/admin/drafts" icon={TrendingUp}>
              Trending Drafts
            </NavItem>
            <NavItem href="/admin/settings" icon={Settings}>
              Settings
            </NavItem>
          </nav>

          <div className="mt-8 pt-4 border-t border-[#262626]">
            <Link
              href="/"
              className="block text-sm text-[#737373] hover:text-[#eab308] transition-colors"
            >
              ← Back to Site
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavItem({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 text-[#ededed] hover:bg-[#262626] hover:text-[#eab308] rounded-lg transition-colors"
    >
      <Icon className="w-5 h-5" />
      {children}
    </Link>
  );
}
