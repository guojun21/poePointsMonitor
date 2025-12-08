import React from 'react';
import { Card } from '../common';
import './StatsCard.css';

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
  return (
    <Card className="bot-stats-card">
      <h3 className="stats-title">🤖 机器人统计</h3>
      <div className="bot-stats-list">
        {botStats && botStats.length > 0 ? (
          botStats.slice(0, 10).map((bot, index) => ( // 增加显示数量，适应大卡片
            <div key={index} className="bot-stat-item">
              <div className="bot-info">
                <span className="bot-rank">#{index + 1}</span>
                <span className="bot-name">{bot.bot_name}</span>
              </div>
              <div className="bot-metrics">
                <span className="bot-cost">{bot.total_cost.toLocaleString()}</span>
                <span className="bot-count">({bot.count} 次)</span>
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





