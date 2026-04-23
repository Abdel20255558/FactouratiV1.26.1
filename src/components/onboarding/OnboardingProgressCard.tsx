import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, CircleDashed, Sparkles } from 'lucide-react';
import { ONBOARDING_TEXT } from './onboardingContent';

interface OnboardingProgressCardProps {
  progressCount: number;
  totalSteps: number;
  steps: Array<{
    key: string;
    title: string;
    description: string;
    complete: boolean;
  }>;
  onContinue: () => void;
}

export default function OnboardingProgressCard({
  progressCount,
  totalSteps,
  steps,
  onContinue,
}: OnboardingProgressCardProps) {
  const progressPercent = Math.round((progressCount / totalSteps) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="overflow-hidden rounded-3xl border border-teal-200 bg-gradient-to-br from-white via-teal-50/60 to-blue-50/90 shadow-sm dark:border-teal-800 dark:from-gray-900 dark:via-teal-950/40 dark:to-blue-950/30"
    >
      <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-teal-700 dark:border-teal-700 dark:bg-gray-900/70 dark:text-teal-200">
            <Sparkles className="h-3.5 w-3.5" />
            Onboarding
          </div>

          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
              {ONBOARDING_TEXT.dashboardCardTitle}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {ONBOARDING_TEXT.dashboardCardDescription}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-200">
              <span>Progression</span>
              <span>
                {progressCount}/{totalSteps}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/80 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 to-blue-600 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="w-full max-w-xl space-y-3">
          {steps.map((step) => (
            <div
              key={step.key}
              className="flex items-start gap-3 rounded-2xl border border-white/70 bg-white/75 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70"
            >
              <div className="mt-0.5">
                {step.complete ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <CircleDashed className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900 dark:text-slate-100">{step.title}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{step.description}</p>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={onContinue}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-teal-700 hover:to-blue-700"
          >
            Continuer
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
