'use client';

/**
 * ADMIN GAMES CONTROL PANEL
 *
 * Enable/disable games, exclude sensitive content,
 * adjust difficulty, view stats.
 */

import { useState, useEffect } from 'react';
import {
  Gamepad2, Settings, Film, AlertTriangle, BarChart2,
  Check, X, RefreshCw, Shield, Sliders
} from 'lucide-react';

interface GameConfig {
  games_enabled: boolean;
  maintenance_mode: boolean;
  enabled_games: string[];
  excluded_movies: string[];
  excluded_celebrities: string[];
  default_difficulty: string;
  adaptive_difficulty: boolean;
  prefer_nostalgic: boolean;
  prefer_classics: boolean;
  exclude_sensitive_content: boolean;
  show_ads_in_games: boolean;
}

interface GameStats {
  game_type: string;
  total_sessions: number;
  completed_sessions: number;
  avg_score: number;
  avg_accuracy: number;
  high_score: number;
}

const GAME_TYPES = [
  { id: 'dumb_charades', name: 'Dumb Charades', description: 'Guess the movie from clues' },
  { id: 'dialogue_guess', name: 'Dialogue Guess', description: 'Who said this iconic line?' },
  { id: 'hit_or_flop', name: 'Hit or Flop', description: 'Guess box office verdict' },
  { id: 'emoji_movie', name: 'Emoji Movie', description: 'Guess from emoji clues' },
  { id: 'director_guess', name: 'Director Quiz', description: 'Who directed this movie?' },
  { id: 'year_guess', name: 'Year Guess', description: 'When was this released?' },
];

export default function AdminGamesPage() {
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [stats, setStats] = useState<GameStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'stats' | 'content'>('config');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [configRes, statsRes] = await Promise.all([
        fetch('/api/admin/games/config'),
        fetch('/api/admin/games/stats'),
      ]);

      const configData = await configRes.json();
      const statsData = await statsRes.json();

      setConfig(configData.config || getDefaultConfig());
      setStats(statsData.stats || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setConfig(getDefaultConfig());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultConfig = (): GameConfig => ({
    games_enabled: true,
    maintenance_mode: false,
    enabled_games: ['dumb_charades', 'dialogue_guess', 'hit_or_flop', 'emoji_movie'],
    excluded_movies: [],
    excluded_celebrities: [],
    default_difficulty: 'medium',
    adaptive_difficulty: true,
    prefer_nostalgic: true,
    prefer_classics: true,
    exclude_sensitive_content: true,
    show_ads_in_games: false,
  });

  const updateConfig = async (updates: Partial<GameConfig>) => {
    if (!config) return;

    const newConfig = { ...config, ...updates };
    setConfig(newConfig);

    setSaving(true);
    try {
      await fetch('/api/admin/games/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
    } catch (error) {
      console.error('Failed to save config:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleGame = (gameId: string) => {
    if (!config) return;

    const enabled = config.enabled_games.includes(gameId)
      ? config.enabled_games.filter(g => g !== gameId)
      : [...config.enabled_games, gameId];

    updateConfig({ enabled_games: enabled });
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Gamepad2 className="w-8 h-8 text-orange-500" />
          <div>
            <h1 className="text-2xl font-bold text-white">Games Control Panel</h1>
            <p className="text-sm text-gray-400">Manage interactive Telugu cinema games</p>
          </div>
        </div>

        {saving && (
          <span className="text-sm text-orange-400 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'config', label: 'Configuration', icon: Settings },
          { id: 'stats', label: 'Statistics', icon: BarChart2 },
          { id: 'content', label: 'Content Filters', icon: Shield },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-orange-500 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Config Tab */}
      {activeTab === 'config' && config && (
        <div className="space-y-6">
          {/* Global Toggle */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" /> Global Settings
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ToggleOption
                label="Games Enabled"
                description="Enable or disable all games"
                enabled={config.games_enabled}
                onChange={(v) => updateConfig({ games_enabled: v })}
              />

              <ToggleOption
                label="Maintenance Mode"
                description="Show maintenance message"
                enabled={config.maintenance_mode}
                onChange={(v) => updateConfig({ maintenance_mode: v })}
                danger
              />

              <ToggleOption
                label="Adaptive Difficulty"
                description="Auto-adjust based on performance"
                enabled={config.adaptive_difficulty}
                onChange={(v) => updateConfig({ adaptive_difficulty: v })}
              />

              <ToggleOption
                label="Prefer Nostalgic Content"
                description="Prioritize classic movies"
                enabled={config.prefer_nostalgic}
                onChange={(v) => updateConfig({ prefer_nostalgic: v })}
              />

              <ToggleOption
                label="Prefer Cult Classics"
                description="Include iconic old movies"
                enabled={config.prefer_classics}
                onChange={(v) => updateConfig({ prefer_classics: v })}
              />

              <ToggleOption
                label="Exclude Sensitive Content"
                description="Filter controversial topics"
                enabled={config.exclude_sensitive_content}
                onChange={(v) => updateConfig({ exclude_sensitive_content: v })}
              />
            </div>

            {/* Default Difficulty */}
            <div className="mt-4">
              <label className="text-sm text-gray-400 block mb-2">Default Difficulty</label>
              <div className="flex gap-2">
                {['easy', 'medium', 'hard', 'legend'].map(d => (
                  <button
                    key={d}
                    onClick={() => updateConfig({ default_difficulty: d })}
                    className={`px-4 py-2 rounded-lg capitalize ${
                      config.default_difficulty === d
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Game Types */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Gamepad2 className="w-5 h-5" /> Game Types
            </h2>

            <div className="space-y-3">
              {GAME_TYPES.map(game => {
                const isEnabled = config.enabled_games.includes(game.id);
                return (
                  <div
                    key={game.id}
                    className="flex items-center justify-between p-4 bg-gray-800 rounded-lg"
                  >
                    <div>
                      <h3 className="font-medium text-white">{game.name}</h3>
                      <p className="text-sm text-gray-400">{game.description}</p>
                    </div>
                    <button
                      onClick={() => toggleGame(game.id)}
                      className={`p-2 rounded-full transition-colors ${
                        isEnabled
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-700 text-gray-400'
                      }`}
                    >
                      {isEnabled ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="card p-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <BarChart2 className="w-5 h-5" /> Game Statistics
          </h2>

          {stats.length === 0 ? (
            <p className="text-gray-400">No game data yet. Statistics will appear once users start playing.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-400 border-b border-gray-700">
                    <th className="pb-3">Game Type</th>
                    <th className="pb-3">Sessions</th>
                    <th className="pb-3">Completed</th>
                    <th className="pb-3">Avg Score</th>
                    <th className="pb-3">Accuracy</th>
                    <th className="pb-3">High Score</th>
                  </tr>
                </thead>
                <tbody className="text-white">
                  {stats.map(stat => (
                    <tr key={stat.game_type} className="border-b border-gray-800">
                      <td className="py-3 capitalize">{stat.game_type.replace('_', ' ')}</td>
                      <td className="py-3">{stat.total_sessions}</td>
                      <td className="py-3">{stat.completed_sessions}</td>
                      <td className="py-3">{Math.round(stat.avg_score || 0)}</td>
                      <td className="py-3">{Math.round(stat.avg_accuracy || 0)}%</td>
                      <td className="py-3 text-orange-400 font-bold">{stat.high_score || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Content Tab */}
      {activeTab === 'content' && config && (
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Film className="w-5 h-5" /> Excluded Movies
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              Movies excluded from all games. Add movie IDs or titles.
            </p>
            <ExclusionList
              items={config.excluded_movies}
              onAdd={(item) => updateConfig({
                excluded_movies: [...config.excluded_movies, item]
              })}
              onRemove={(item) => updateConfig({
                excluded_movies: config.excluded_movies.filter(m => m !== item)
              })}
              placeholder="Add movie ID or title..."
            />
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Excluded Celebrities
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              Celebrities excluded from games. Add names or IDs.
            </p>
            <ExclusionList
              items={config.excluded_celebrities}
              onAdd={(item) => updateConfig({
                excluded_celebrities: [...config.excluded_celebrities, item]
              })}
              onRemove={(item) => updateConfig({
                excluded_celebrities: config.excluded_celebrities.filter(c => c !== item)
              })}
              placeholder="Add celebrity name..."
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// COMPONENTS
// ============================================================

function ToggleOption({
  label,
  description,
  enabled,
  onChange,
  danger = false,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
      <div>
        <h3 className={`font-medium ${danger && enabled ? 'text-red-400' : 'text-white'}`}>
          {label}
        </h3>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          enabled
            ? danger ? 'bg-red-500' : 'bg-green-500'
            : 'bg-gray-600'
        }`}
      >
        <div
          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
            enabled ? 'translate-x-7' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

function ExclusionList({
  items,
  onAdd,
  onRemove,
  placeholder,
}: {
  items: string[];
  onAdd: (item: string) => void;
  onRemove: (item: string) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    if (input.trim() && !items.includes(input.trim())) {
      onAdd(input.trim());
      setInput('');
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={placeholder}
          className="input flex-1"
        />
        <button onClick={handleAdd} className="btn btn-primary">
          Add
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No exclusions</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map(item => (
            <span
              key={item}
              className="inline-flex items-center gap-1 px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm"
            >
              {item}
              <button
                onClick={() => onRemove(item)}
                className="text-gray-500 hover:text-red-400"
              >
                <X className="w-4 h-4" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}








