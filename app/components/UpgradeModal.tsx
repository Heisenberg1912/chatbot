'use client';

import { X, Check, Zap, MessageSquare, Infinity } from 'lucide-react';

interface Props {
  onClose: () => void;
  currentPlan?: string;
}

const FREE_FEATURES = [
  { text: '5 messages per module', included: true },
  { text: 'All 5 modules accessible', included: true },
  { text: 'Basic chat history', included: true },
  { text: 'Media gallery (session only)', included: true },
  { text: 'Unlimited messages', included: false },
  { text: 'Saved media library', included: false },
  { text: 'Priority support', included: false },
];

const PRO_FEATURES = [
  { text: 'Unlimited messages', included: true },
  { text: 'All 5 modules accessible', included: true },
  { text: 'Full chat history', included: true },
  { text: 'Persistent media gallery', included: true },
  { text: 'Save & bookmark media', included: true },
  { text: 'Priority support', included: true },
  { text: 'Early access to new features', included: true },
];

export default function UpgradeModal({ onClose, currentPlan = 'free' }: Props) {
  const isPro = currentPlan === 'pro' || currentPlan === 'enterprise';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-surface-light border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-2xl mx-4 overflow-hidden shadow-xl dark:shadow-none text-gray-900 dark:text-content">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-white/5">
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-amber-500" />
            <h2 className="font-semibold text-lg text-gray-900 dark:text-white">{isPro ? 'Your Plan' : 'Upgrade Your Plan'}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-content-muted hover:text-gray-900 dark:hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Free Plan */}
          <div className={`rounded-xl border p-5 ${!isPro ? 'border-gray-300 dark:border-white/20 bg-gray-50 dark:bg-surface' : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-surface opacity-70'}`}>
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare size={18} className="text-gray-500 dark:text-content-muted" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Free</h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-content-muted mb-4">Get started with BuildBot</p>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-5">
              $0 <span className="text-sm font-normal text-gray-500 dark:text-content-muted">/ month</span>
            </div>
            <ul className="space-y-3">
              {FREE_FEATURES.map((feature, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm">
                  {feature.included ? (
                    <Check size={16} className="text-green-500 shrink-0" />
                  ) : (
                    <X size={16} className="text-gray-300 dark:text-white/20 shrink-0" />
                  )}
                  <span className={feature.included ? 'text-gray-700 dark:text-content' : 'text-gray-400 dark:text-content-subtle'}>
                    {feature.text}
                  </span>
                </li>
              ))}
            </ul>
            {!isPro && (
              <div className="mt-5 px-4 py-2.5 rounded-lg bg-gray-200 dark:bg-white/5 text-center text-sm font-medium text-gray-500 dark:text-content-muted">
                Current plan
              </div>
            )}
          </div>

          {/* Pro Plan */}
          <div className="rounded-xl border-2 border-amber-400 dark:border-amber-500/50 p-5 bg-amber-50 dark:bg-amber-500/5 relative">
            <div className="absolute -top-3 right-4 px-2.5 py-0.5 bg-amber-400 dark:bg-amber-500 text-white text-xs font-semibold rounded-full">
              {isPro ? 'Active' : 'Recommended'}
            </div>
            <div className="flex items-center gap-2 mb-1">
              <Infinity size={18} className="text-amber-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Pro</h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-content-muted mb-4">Unlimited access to all features</p>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-5">
              Pro <span className="text-sm font-normal text-gray-500 dark:text-content-muted">/ month</span>
            </div>
            <ul className="space-y-3">
              {PRO_FEATURES.map((feature, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm">
                  <Check size={16} className="text-amber-500 shrink-0" />
                  <span className="text-gray-700 dark:text-content">{feature.text}</span>
                </li>
              ))}
            </ul>
            {isPro ? (
              <div className="mt-5 px-4 py-2.5 rounded-lg bg-amber-400 dark:bg-amber-500/20 text-center text-sm font-medium text-amber-800 dark:text-amber-300">
                Current plan
              </div>
            ) : (
              <a
                href="mailto:support@buildbot.ai?subject=Upgrade to Pro"
                className="mt-5 block px-4 py-2.5 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-surface text-center text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm"
              >
                Contact us to upgrade
              </a>
            )}
          </div>
        </div>

        <div className="px-6 pb-5 pt-1">
          <p className="text-xs text-gray-400 dark:text-content-subtle text-center">
            {isPro
              ? 'You have unlimited access to all Builtattic features.'
              : 'Contact our team to upgrade your plan. Pro access will be activated within 24 hours.'}
          </p>
        </div>
      </div>
    </div>
  );
}
