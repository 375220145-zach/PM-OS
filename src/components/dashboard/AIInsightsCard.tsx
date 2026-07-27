'use client';

import { useState, useCallback } from 'react';
import Button from '../shared/Button';
import Icon from '../shared/Icon';

interface RiskItem {
  category: string;
  severity: string;
  title: string;
  impact: string;
  suggestion: string;
}

interface CostItem {
  category: string;
  estimated: number;
  actual: number;
  deviationPercent: number;
  trend: string;
  suggestion: string;
}

interface Bottleneck {
  task: string;
  blocks: string[];
  riskLevel: string;
  suggestion: string;
}

interface InsightsResult {
  risk?: { risks: RiskItem[]; summary: string };
  cost?: { analyses: CostItem[]; summary: string; totalDeviationPercent: number };
  schedule?: { bottlenecks: Bottleneck[]; summary: string };
}

// Static demo data for when API routes aren't available
const DEMO_INSIGHTS: InsightsResult = {
  risk: {
    risks: [
      { category: 'milestone', severity: 'P0', title: 'TR2 评审材料未完成', impact: 'DVT 准入延迟，影响后续所有节点', suggestion: '优先补齐 FCC 测试报告，评估是否可并行启动模具' },
      { category: 'mil', severity: 'P1', title: 'Booster-Output 噪声问题未关闭', impact: '可能影响音色品质，用户投诉风险', suggestion: '安排专项技术攻关，确定根因后评估是否需要 ECN' },
    ],
    summary: '2 项风险待处理，其中 1 项 P0 涉及关键路径阻塞。',
  },
  cost: {
    analyses: [
      { category: '模具', estimated: 120000, actual: 135000, deviationPercent: 12.5, trend: 'worsening', suggestion: '启动第二供应商询价，评估简化结构的可行性' },
    ],
    summary: '总成本偏差 5.2%，模具超支 12.5% 为主要驱动因素。',
    totalDeviationPercent: 5.2,
  },
  schedule: {
    bottlenecks: [
      { task: 'TR2 评审', blocks: ['DVT 启动', '模具开模', '认证送检'], riskLevel: 'high', suggestion: '如 TR2 延迟超过缓冲期，评估跳过 HMS 2.0 直接进入 DVT 的可行性' },
    ],
    summary: '1 个瓶颈任务阻塞 3 个下游节点，建议优先排解。',
  },
};

type TabKey = 'risk' | 'cost' | 'schedule';

interface Props {
  onRunAnalysis: () => Promise<InsightsResult | null>;
  isDemo?: boolean;
}

export default function AIInsightsCard({ onRunAnalysis, isDemo }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InsightsResult | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('risk');
  const [error, setError] = useState<string | null>(null);

  const handleRun = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await onRunAnalysis();
      setResult(r);
    } catch {
      setError('分析失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [onRunAnalysis]);

  const displayResult = isDemo ? DEMO_INSIGHTS : result;

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'risk', label: '风险', count: displayResult?.risk?.risks.length },
    { key: 'cost', label: '成本', count: displayResult?.cost ? 1 : undefined },
    { key: 'schedule', label: '排期', count: displayResult?.schedule?.bottlenecks.length },
  ];

  const severityBadge = (s: string) => {
    const isP0 = s === 'P0';
    return (
      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${isP0 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
        {s}
      </span>
    );
  };

  const riskLevelBadge = (level: string) => {
    const colors: Record<string, string> = {
      high: 'bg-red-50 text-red-700',
      medium: 'bg-amber-50 text-amber-700',
      low: 'bg-gray-100 text-gray-600',
    };
    return (
      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${colors[level] || colors.medium}`}>
        {level === 'high' ? '高' : level === 'medium' ? '中' : '低'}
      </span>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Icon name="sparkles" size={18} stroke={1.5} className="text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-900">AI 洞察</h2>
          {isDemo && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Demo 示例</span>
          )}
        </div>
        <Button size="sm" onClick={handleRun} disabled={loading}>
          {loading ? '分析中...' : '运行分析'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 px-5">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${
              activeTab === tab.key
                ? 'border-gray-800 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-5">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3 mb-3">{error}</div>
        )}

        {!displayResult && !loading && (
          <div className="text-center py-8 text-gray-500 text-sm">
            点击「运行分析」获取 AI 洞察
          </div>
        )}

        {loading && (
          <div className="space-y-3 animate-pulse">
            {[1, 2].map(i => (
              <div key={i} className="h-16 bg-gray-50 rounded-lg" />
            ))}
          </div>
        )}

        {/* Risk Tab */}
        {activeTab === 'risk' && displayResult?.risk && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-3">{displayResult.risk.summary}</p>
            {displayResult.risk.risks.map((r, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  {severityBadge(r.severity)}
                  <span className="text-sm font-medium text-gray-900">{r.title}</span>
                </div>
                <p className="text-sm text-gray-600 mb-1">影响：{r.impact}</p>
                <p className="text-sm text-gray-500">建议：{r.suggestion}</p>
              </div>
            ))}
          </div>
        )}

        {/* Cost Tab */}
        {activeTab === 'cost' && displayResult?.cost && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-3">
              {displayResult.cost.summary}
              {displayResult.cost.totalDeviationPercent > 0 && (
                <span className="ml-1 text-amber-600 font-medium">
                  总偏差 +{displayResult.cost.totalDeviationPercent}%
                </span>
              )}
            </p>
            {displayResult.cost.analyses.map((a, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-900">{a.category}</span>
                  <span className={`text-sm font-medium ${a.deviationPercent > 10 ? 'text-amber-600' : 'text-gray-500'}`}>
                    +{a.deviationPercent}%
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-1">
                  <span>预估 ¥{(a.estimated / 10000).toFixed(1)}万</span>
                  <span>实际 ¥{(a.actual / 10000).toFixed(1)}万</span>
                  <span className={a.trend === 'worsening' ? 'text-amber-600' : 'text-gray-400'}>
                    {a.trend === 'worsening' ? '持续超支' : a.trend === 'stable' ? '稳定' : '改善中'}
                  </span>
                </div>
                <p className="text-sm text-gray-500">建议：{a.suggestion}</p>
              </div>
            ))}
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && displayResult?.schedule && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-3">{displayResult.schedule.summary}</p>
            {displayResult.schedule.bottlenecks.map((b, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  {riskLevelBadge(b.riskLevel)}
                  <span className="text-sm font-medium text-gray-900">{b.task}</span>
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  阻塞：{b.blocks.join('、')}
                </p>
                <p className="text-sm text-gray-500">建议：{b.suggestion}</p>
              </div>
            ))}
            {displayResult.schedule.bottlenecks.length === 0 && (
              <div className="text-center py-4 text-gray-500 text-sm">未发现明显瓶颈</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
