import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { BlogSeoCheck } from '../../../types/blog';

type SeoChecklistProps = {
  checks: BlogSeoCheck[];
  onCheckClick?: (check: BlogSeoCheck) => void;
};

const statusConfig = {
  passed: {
    Icon: CheckCircle2,
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200',
    iconClassName: 'text-emerald-600 dark:text-emerald-300',
    label: 'OK',
  },
  warning: {
    Icon: AlertTriangle,
    className: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200',
    iconClassName: 'text-amber-600 dark:text-amber-300',
    label: 'A ameliorer',
  },
  failed: {
    Icon: XCircle,
    className: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200',
    iconClassName: 'text-red-600 dark:text-red-300',
    label: 'Manquant',
  },
};

export default function SeoChecklist({ checks, onCheckClick }: SeoChecklistProps) {
  return (
    <div className="space-y-3">
      {checks.map((check) => {
        const config = statusConfig[check.status];
        const Icon = config.Icon;
        const isClickable = Boolean(onCheckClick && check.targetId);
        const Container = isClickable ? 'button' : 'div';

        return (
          <Container
            key={check.id}
            type={isClickable ? 'button' : undefined}
            onClick={isClickable ? () => onCheckClick?.(check) : undefined}
            className={`w-full rounded-2xl border p-4 text-left transition ${
              isClickable ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500' : ''
            } ${config.className}`}
          >
            <div className="flex items-start gap-3">
              <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${config.iconClassName}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{check.label}</p>
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-bold dark:bg-slate-900/40">
                    {config.label}
                  </span>
                  {check.points > 0 && (
                    <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-bold dark:bg-slate-900/40">
                      +{check.points}
                    </span>
                  )}
                </div>
                {check.status !== 'passed' && (
                  <p className="mt-1 text-sm opacity-90">{check.recommendation}</p>
                )}
                {isClickable && check.status !== 'passed' && (
                  <p className="mt-2 text-xs font-bold opacity-90">Cliquer pour aller au champ a corriger</p>
                )}
              </div>
            </div>
          </Container>
        );
      })}
    </div>
  );
}
