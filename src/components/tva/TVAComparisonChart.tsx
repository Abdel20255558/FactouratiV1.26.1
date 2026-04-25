import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import type { VatHistoryPoint } from '../../types/vat';
import { formatMad } from '../../utils/vat';

interface TVAComparisonChartProps {
  data: VatHistoryPoint[];
}

export default function TVAComparisonChart({ data }: TVAComparisonChartProps) {
  const hasData = data.some((item) => item.purchaseVat > 0 || item.salesVat > 0);

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">TVA achats vs ventes</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Vue sur 6 mois glissants</p>
        </div>
        <div className="rounded-2xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
          <BarChart3 className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-6 h-80">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" stroke="#6b7280" fontSize={12} />
              <YAxis
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(value) => `${Math.round(value / 1000)}k`}
              />
              <Tooltip
                formatter={(value: number) => formatMad(value)}
                labelFormatter={(label) => `Periode: ${label}`}
                contentStyle={{
                  borderRadius: 16,
                  border: '1px solid #d1d5db',
                  boxShadow: '0 10px 25px rgba(15, 23, 42, 0.08)',
                }}
              />
              <Bar dataKey="purchaseVat" name="TVA achats" fill="#f97316" radius={[8, 8, 0, 0]} />
              <Bar dataKey="salesVat" name="TVA ventes" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="rounded-full bg-gray-100 p-4 text-gray-400 dark:bg-gray-700 dark:text-gray-500">
              <BarChart3 className="h-8 w-8" />
            </div>
            <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-200">
              Pas encore de donnees TVA sur les 6 derniers mois
            </p>
            <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
              Ajoutez vos premieres factures achat pour visualiser l’evolution entre TVA deductible et TVA collectee.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
