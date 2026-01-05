'use client';

import { useState, useEffect, useCallback } from 'react';
import { Heart, ChevronLeft, ChevronRight, Sparkles, X, Send } from 'lucide-react';
import type { Dedication, DedicationType, AnimationType } from '@/types/reviews';
import { ANIMATION_CONFIG, DEDICATION_TYPE_LABELS } from '@/types/reviews';

interface DedicationsWidgetProps {
  position?: 'bottom-left' | 'bottom-right';
}

export function DedicationsWidget({ position = 'bottom-left' }: DedicationsWidgetProps) {
  const [dedications, setDedications] = useState<Dedication[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [particles, setParticles] = useState<{id: number; emoji: string; x: number; y: number}[]>([]);

  // Fetch dedications
  useEffect(() => {
    async function fetchDedications() {
      try {
        const res = await fetch('/api/dedications?limit=20');
        const data = await res.json();
        setDedications(data.dedications || []);
      } catch (error) {
        console.error('Error fetching dedications:', error);
      }
    }

    fetchDedications();
    // Refresh every 5 minutes
    const interval = setInterval(fetchDedications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-rotate dedications
  useEffect(() => {
    if (dedications.length <= 1 || isExpanded) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % dedications.length);
      triggerAnimation();
    }, 8000);

    return () => clearInterval(interval);
  }, [dedications.length, isExpanded]);

  // Trigger particle animation
  const triggerAnimation = useCallback(() => {
    if (dedications.length === 0) return;

    const dedication = dedications[currentIndex];
    const config = ANIMATION_CONFIG[dedication?.animation_type || 'flowers'];

    if (config.particles.length === 0) return;

    const newParticles = Array.from({ length: 15 }, (_, i) => ({
      id: Date.now() + i,
      emoji: config.particles[Math.floor(Math.random() * config.particles.length)],
      x: Math.random() * 100,
      y: Math.random() * 100,
    }));

    setParticles(newParticles);
    setTimeout(() => setParticles([]), 2000);
  }, [dedications, currentIndex]);

  const currentDedication = dedications[currentIndex];
  const typeConfig = currentDedication
    ? DEDICATION_TYPE_LABELS[currentDedication.dedication_type]
    : null;

  if (dedications.length === 0 && !showSubmit) {
    return (
      <button
        onClick={() => setShowSubmit(true)}
        className={`fixed ${position === 'bottom-left' ? 'left-4' : 'right-4'} bottom-4 z-40
          px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full
          shadow-lg hover:shadow-xl transition-all flex items-center gap-2`}
      >
        <Heart className="w-5 h-5" />
        <span className="text-sm font-medium">Send Dedication</span>
      </button>
    );
  }

  return (
    <>
      {/* Main Widget */}
      <div
        className={`fixed ${position === 'bottom-left' ? 'left-4' : 'right-4'} bottom-4 z-40
          ${isExpanded ? 'w-80' : 'w-72'} transition-all duration-300`}
      >
        {/* Particle Animation Layer */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((particle) => (
            <span
              key={particle.id}
              className="absolute text-2xl animate-float-up"
              style={{
                left: `${particle.x}%`,
                bottom: `${particle.y}%`,
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            >
              {particle.emoji}
            </span>
          ))}
        </div>

        {/* Widget Card */}
        <div
          className={`bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900
            rounded-2xl shadow-2xl border border-gray-700 overflow-hidden
            ${currentDedication?.is_premium ? 'ring-2 ring-yellow-500' : ''}`}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-pink-500/20 to-purple-500/20 cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-pink-400" />
              <span className="text-sm font-medium text-white">అభిమానుల అంకితం</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSubmit(true);
                }}
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
                title="Send Dedication"
              >
                <Send className="w-4 h-4 text-gray-400" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          {currentDedication && (
            <div className="p-4">
              {/* Type Badge */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{typeConfig?.icon}</span>
                <span className="text-xs font-medium text-pink-400">
                  {typeConfig?.labelTe}
                </span>
                {currentDedication.is_premium && (
                  <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-xs rounded-full">
                    ⭐ Premium
                  </span>
                )}
              </div>

              {/* To/From */}
              <div className="mb-2">
                <span className="text-yellow-500 font-bold">{currentDedication.to_name}</span>
                {currentDedication.to_relation && (
                  <span className="text-gray-500 text-sm ml-1">
                    ({currentDedication.to_relation})
                  </span>
                )}
              </div>

              {/* Message */}
              <p className={`text-gray-300 text-sm leading-relaxed mb-3 ${isExpanded ? '' : 'line-clamp-3'}`}>
                "{currentDedication.message}"
              </p>

              {/* From */}
              <div className="text-right">
                <span className="text-gray-400 text-xs">- {currentDedication.from_name}</span>
                {currentDedication.from_location && (
                  <span className="text-gray-500 text-xs ml-1">
                    ({currentDedication.from_location})
                  </span>
                )}
              </div>

              {/* Celebrity Tag */}
              {currentDedication.celebrity_name && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <span className="text-xs text-gray-500">For: </span>
                  <span className="text-xs text-yellow-500">{currentDedication.celebrity_name}</span>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          {dedications.length > 1 && (
            <div className="flex items-center justify-between px-4 pb-3">
              <button
                onClick={() => {
                  setCurrentIndex((prev) => (prev - 1 + dedications.length) % dedications.length);
                  triggerAnimation();
                }}
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              </button>

              {/* Dots */}
              <div className="flex gap-1">
                {dedications.slice(0, 5).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCurrentIndex(i);
                      triggerAnimation();
                    }}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === currentIndex ? 'bg-pink-500' : 'bg-gray-600'
                    }`}
                  />
                ))}
                {dedications.length > 5 && (
                  <span className="text-gray-500 text-xs ml-1">+{dedications.length - 5}</span>
                )}
              </div>

              <button
                onClick={() => {
                  setCurrentIndex((prev) => (prev + 1) % dedications.length);
                  triggerAnimation();
                }}
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Submit Dedication Modal */}
      {showSubmit && (
        <SubmitDedicationModal onClose={() => setShowSubmit(false)} />
      )}

      {/* Animation Styles */}
      <style jsx global>{`
        @keyframes float-up {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1) rotate(0deg);
          }
          100% {
            opacity: 0;
            transform: translateY(-150px) scale(0.5) rotate(360deg);
          }
        }
        .animate-float-up {
          animation: float-up 2s ease-out forwards;
        }
      `}</style>
    </>
  );
}

/**
 * Submit Dedication Modal
 */
function SubmitDedicationModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    dedication_type: 'birthday' as DedicationType,
    from_name: '',
    from_location: '',
    to_name: '',
    to_relation: '',
    message: '',
    animation_type: 'balloons' as AnimationType,
    celebrity_name: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.from_name || !formData.to_name || !formData.message) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/dedications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setSubmitted(true);
        setTimeout(() => {
          setSubmitted(false);
          onClose();
        }, 3000);
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to submit');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('Failed to submit dedication');
    }
    setSubmitting(false);
  }

  // Update default animation when type changes
  useEffect(() => {
    const config = DEDICATION_TYPE_LABELS[formData.dedication_type];
    setFormData(prev => ({ ...prev, animation_type: config.defaultAnimation }));
  }, [formData.dedication_type]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" />
            Send Dedication
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">💝</div>
            <h3 className="text-xl font-bold text-white mb-2">Thank You!</h3>
            <p className="text-gray-400">
              Your dedication has been submitted and is pending approval.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Type */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Dedication Type *</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(DEDICATION_TYPE_LABELS) as DedicationType[]).map((type) => {
                  const config = DEDICATION_TYPE_LABELS[type];
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, dedication_type: type })}
                      className={`p-2 rounded-lg text-center transition-colors ${
                        formData.dedication_type === type
                          ? 'bg-pink-500/20 border-pink-500 text-pink-400'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                      } border`}
                    >
                      <span className="text-xl block">{config.icon}</span>
                      <span className="text-xs">{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* To */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-2">To (Name) *</label>
                <input
                  type="text"
                  value={formData.to_name}
                  onChange={(e) => setFormData({ ...formData, to_name: e.target.value })}
                  placeholder="Recipient's name"
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Relation</label>
                <input
                  type="text"
                  value={formData.to_relation}
                  onChange={(e) => setFormData({ ...formData, to_relation: e.target.value })}
                  placeholder="e.g., friend, wife"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none"
                />
              </div>
            </div>

            {/* From */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-2">From (Your Name) *</label>
                <input
                  type="text"
                  value={formData.from_name}
                  onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
                  placeholder="Your name"
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Location</label>
                <input
                  type="text"
                  value={formData.from_location}
                  onChange={(e) => setFormData({ ...formData, from_location: e.target.value })}
                  placeholder="e.g., Hyderabad"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Message * ({formData.message.length}/500)
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value.slice(0, 500) })}
                placeholder="Write your dedication message..."
                required
                rows={4}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none resize-none"
              />
            </div>

            {/* Celebrity (optional) */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">For Celebrity (Optional)</label>
              <input
                type="text"
                value={formData.celebrity_name}
                onChange={(e) => setFormData({ ...formData, celebrity_name: e.target.value })}
                placeholder="e.g., Mahesh Babu"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none"
              />
            </div>

            {/* Animation */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Animation Effect</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(ANIMATION_CONFIG) as AnimationType[]).filter(a => a !== 'none').map((anim) => {
                  const config = ANIMATION_CONFIG[anim];
                  return (
                    <button
                      key={anim}
                      type="button"
                      onClick={() => setFormData({ ...formData, animation_type: anim })}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors flex items-center gap-1 ${
                        formData.animation_type === anim
                          ? 'bg-pink-500/20 text-pink-400 border-pink-500'
                          : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
                      } border`}
                    >
                      <span>{config.emoji}</span>
                      <span className="capitalize">{anim}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !formData.from_name || !formData.to_name || !formData.message}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
            >
              <Heart className="w-5 h-5" />
              {submitting ? 'Submitting...' : 'Send Dedication'}
            </button>

            <p className="text-xs text-gray-500 text-center">
              Dedications are reviewed before publishing. Inappropriate content will be rejected.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}








