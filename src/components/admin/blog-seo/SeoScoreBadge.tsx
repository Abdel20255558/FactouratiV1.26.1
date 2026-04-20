import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getSeoQuality } from '../../../utils/blogSeo';

type SeoScoreBadgeProps = {
  score: number;
  size?: 'sm' | 'md' | 'lg';
};

export default function SeoScoreBadge({ score, size = 'md' }: SeoScoreBadgeProps) {
  const quality = getSeoQuality(score);
  const config = {
    good: {
      label: 'Bon SEO',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300',
      Icon: CheckCircle2,
    },
    medium: {
      label: 'SEO moyen',
      className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300',
      Icon: AlertTriangle,
    },
    low: {
      label: 'SEO faible',
      className: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300',
      Icon: AlertCircle,
    },
  }[quality];
  const Icon = config.Icon;
  const sizeClass = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  }[size];

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border font-bold ${config.className} ${sizeClass}`}>
      <Icon className={size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} />
      {score}/100
      <span className="hidden sm:inline">{config.label}</span>
    </span>
  );
}
