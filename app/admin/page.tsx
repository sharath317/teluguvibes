import { FileText, Eye, MessageCircle, TrendingUp } from 'lucide-react';

// Mock stats - Replace with Supabase queries
async function getStats() {
  return {
    totalPosts: 156,
    publishedPosts: 142,
    draftPosts: 14,
    totalViews: 1250000,
    totalComments: 4532,
    trendingDrafts: 8,
  };
}

export default async function AdminDashboard() {
  const stats = await getStats();

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Posts"
          value={stats.totalPosts}
          icon={FileText}
          color="bg-blue-500"
        />
        <StatCard
          title="Total Views"
          value={stats.totalViews.toLocaleString()}
          icon={Eye}
          color="bg-green-500"
        />
        <StatCard
          title="Comments"
          value={stats.totalComments.toLocaleString()}
          icon={MessageCircle}
          color="bg-purple-500"
        />
        <StatCard
          title="Pending Drafts"
          value={stats.draftPosts}
          icon={TrendingUp}
          color="bg-[#eab308]"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <ActionButton href="/admin/posts/new">
              ➕ Create New Post
            </ActionButton>
            <ActionButton href="/admin/drafts">
              📥 Import Google Trends
            </ActionButton>
            <ActionButton href="/admin/posts?status=draft">
              📝 Review Drafts ({stats.draftPosts})
            </ActionButton>
          </div>
        </div>

        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Recent Activity</h2>
          <div className="space-y-3 text-sm">
            <ActivityItem time="2 hours ago" action="Post published: టాలీవుడ్ స్టార్ హీరో..." />
            <ActivityItem time="3 hours ago" action="New comment on: IPL 2024..." />
            <ActivityItem time="5 hours ago" action="Draft created from trends" />
            <ActivityItem time="1 day ago" action="Post updated: ముఖ్యమంత్రి..." />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#737373]">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className={`${color} p-3 rounded-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="block w-full px-4 py-3 bg-[#262626] hover:bg-[#363636] text-white rounded-lg transition-colors text-center"
    >
      {children}
    </a>
  );
}

function ActivityItem({ time, action }: { time: string; action: string }) {
  return (
    <div className="flex items-start gap-3 p-2 hover:bg-[#0a0a0a] rounded-lg transition-colors">
      <span className="text-xs text-[#737373] whitespace-nowrap">{time}</span>
      <span className="text-[#ededed] truncate">{action}</span>
    </div>
  );
}

