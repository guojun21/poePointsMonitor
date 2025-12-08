import React, { useState, useMemo } from 'react';
import { Card } from '../common';
import './StatsCard.css';

// 排序选项
const SORT_OPTIONS = [
  { key: 'count', label: '次数' },
  { key: 'cost', label: '总Cost' },
  { key: 'avgCost', label: '平均Cost' }
];

export const TotalStatsCard = ({ totalStats }) => {
  return (
    <Card className="total-stats-card">
      <h3 className="stats-title">📊 总体统计</h3>
      <div className="stats-items">
        <div className="stat-item">
          <span className="stat-label">总积分消耗</span>
          <span className="stat-value stat-primary">
            {totalStats?.totalCost?.toLocaleString() || 0}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">总记录数</span>
          <span className="stat-value stat-secondary">
            {totalStats?.totalCount?.toLocaleString() || 0}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">平均每次消耗</span>
          <span className="stat-value stat-info">
            {totalStats?.avgCost?.toLocaleString() || 0}
          </span>
        </div>
      </div>
    </Card>
  );
};

export const BotStatsCard = ({ botStats }) => {
  const [sortBy, setSortBy] = useState('cost'); // 'count' | 'cost' | 'avgCost'

  // 处理数据并排序
  const sortedBots = useMemo(() => {
    if (!botStats) return [];
    
    const bots = botStats.map(b => ({
      name: b.bot_name,
      count: b.count,
      cost: b.total_cost,
      avgCost: b.count > 0 ? b.total_cost / b.count : 0
    }));
    
    // 计算总数用于百分比
    const totalCount = bots.reduce((sum, b) => sum + b.count, 0);
    
    return bots.map(b => ({
      ...b,
      percentage: totalCount > 0 ? (b.count / totalCount) * 100 : 0
    })).sort((a, b) => {
      if (sortBy === 'count') return b.count - a.count;
      if (sortBy === 'cost') return b.cost - a.cost;
      if (sortBy === 'avgCost') return b.avgCost - a.avgCost;
      return 0;
    });
  }, [botStats, sortBy]);

  // 计算柱状图的最大值（用于百分比计算）
  const maxValue = useMemo(() => {
    if (sortedBots.length === 0) return 1;
    if (sortBy === 'count') return Math.max(...sortedBots.map(m => m.count));
    if (sortBy === 'cost') return Math.max(...sortedBots.map(m => m.cost));
    if (sortBy === 'avgCost') return Math.max(...sortedBots.map(m => m.avgCost));
    return 1;
  }, [sortedBots, sortBy]);

  // 获取柱状图宽度百分比
  const getBarWidth = (bot) => {
    if (maxValue === 0) return 0;
    if (sortBy === 'count') return (bot.count / maxValue) * 100;
    if (sortBy === 'cost') return (bot.cost / maxValue) * 100;
    if (sortBy === 'avgCost') return (bot.avgCost / maxValue) * 100;
    return 0;
  };

  // 格式化 cost 为美元格式
  const formatCost = (cost) => {
    return `$${cost.toFixed(2)}`;
  };

  // 格式化平均 cost
  const formatAvgCost = (avgCost) => {
    return `$${avgCost.toFixed(4)}`;
  };

  return (
    <Card className="bot-stats-card">
      <div className="bot-stats-header">
        <div className="bot-stats-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
        </div>
        <span className="bot-stats-title">Model Distribution</span>
      </div>

      {/* 排序切换按钮 */}
      <div className="sort-toggle-group">
        {SORT_OPTIONS.map(option => (
          <button
            key={option.key}
            className={`sort-toggle-btn ${sortBy === option.key ? 'active' : ''}`}
            onClick={() => setSortBy(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="bot-stats-list custom-scrollbar">
        {sortedBots.length > 0 ? (
          sortedBots.map((bot, index) => (
            <div className="model-item" key={bot.name}>
              <div className="model-item-header">
                <span className="model-name">{bot.name}</span>
                <span className="model-count">
                  {bot.count.toLocaleString()} ({bot.percentage.toFixed(1)}%)
                  {bot.cost > 0 && (
                    <>
                      <span className="model-cost"> · {formatCost(bot.cost)}</span>
                      <span className="model-avg-cost"> (avg: {formatAvgCost(bot.avgCost)})</span>
                    </>
                  )}
                </span>
              </div>
              <div className="model-bar-bg">
                <div
                  className={`model-bar color-${index % 6}`}
                  style={{ width: `${getBarWidth(bot)}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="empty-stats">暂无数据</p>
        )}
      </div>
    </Card>
  );
};

// 保持兼容性
const StatsCard = ({ botStats, totalStats }) => {
  return (
    <div className="stats-grid">
      <TotalStatsCard totalStats={totalStats} />
      <BotStatsCard botStats={botStats} />
    </div>
  );
};

export default StatsCard;






