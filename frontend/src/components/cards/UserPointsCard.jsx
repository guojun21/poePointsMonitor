import React, { useState, useEffect } from 'react';
import { Card } from '../common';
import logger from '../../logger';
import './UserPointsCard.css';

const UserPointsCard = ({ refreshTrigger }) => {
  const [pointsInfo, setPointsInfo] = useState(null);
  const [subscriptionCostInfo, setSubscriptionCostInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPointsInfo = async () => {
    logger.api('UserPointsCard: 获取用户积分信息');
    try {
      const response = await fetch('http://localhost:58232/api/user-points-info');
      const data = await response.json();
      logger.data('UserPointsCard: 收到积分数据', data);
      if (!data.error) {
        setPointsInfo(data);
        logger.success('UserPointsCard: 积分信息加载成功', {
          balance: data.current_balance,
          usagePercent: data.usage_percentage?.toFixed(1)
        });
      } else {
        logger.warning('UserPointsCard: 积分信息返回错误', data.error);
      }
    } catch (error) {
      logger.error('UserPointsCard: 获取积分信息失败', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptionCostInfo = async () => {
    logger.api('UserPointsCard: 获取订阅费用信息');
    try {
      const response = await fetch('http://localhost:58232/api/subscription-cost-info');
      const data = await response.json();
      logger.data('UserPointsCard: 收到订阅费用数据', data);
      setSubscriptionCostInfo(data);
    } catch (error) {
      logger.error('UserPointsCard: 获取订阅费用信息失败', error.message);
    }
  };

  useEffect(() => {
    logger.debug('UserPointsCard: refreshTrigger 变化', { refreshTrigger });
    fetchPointsInfo();
    fetchSubscriptionCostInfo();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <Card className="user-points-card">
        <div className="loading">加载中...</div>
      </Card>
    );
  }

  if (!pointsInfo) {
    return (
      <Card className="user-points-card">
        <div className="empty-state">
          <p>📊 暂无积分信息</p>
          <p className="hint">请先配置 Cookie 等信息</p>
        </div>
      </Card>
    );
  }

  const formatNumber = (num) => {
    return num?.toLocaleString('zh-CN') || 0;
  };

  const getUsageColor = (percentage) => {
    if (percentage < 50) return '#10b981'; // green
    if (percentage < 80) return '#f59e0b'; // orange
    return '#ef4444'; // red
  };

  const getRemainingDaysColor = (days) => {
    if (days > 15) return '#10b981';
    if (days > 7) return '#f59e0b';
    return '#ef4444';
  };

  // 格式化美元金额
  const formatUSD = (amount) => {
    if (amount === undefined || amount === null) return '$0.00';
    return `$${amount.toFixed(2)}`;
  };

  // 获取货币符号
  const getCurrencySymbol = (currency) => {
    const symbols = {
      'USD': '$',
      'HKD': 'HK$',
      'CNY': '¥',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'TWD': 'NT$',
    };
    return symbols[currency] || currency;
  };

  // 计算基于已使用积分的美元花销
  const calculateUsedPointsValueUSD = () => {
    if (!pointsInfo || !subscriptionCostInfo || !subscriptionCostInfo.subscription_amount) {
      return null;
    }
    // 使用用户积分总额和已使用积分计算
    const totalAllotment = pointsInfo.total_allotment || 1000000;
    const usedPoints = pointsInfo.used_points || 0;
    const subscriptionAmountUSD = subscriptionCostInfo.subscription_amount_usd || 0;
    
    // 每积分对应的美元价值
    const pointValueUSD = subscriptionAmountUSD / totalAllotment;
    return usedPoints * pointValueUSD;
  };

  return (
    <Card className="user-points-card">
      <div className="card-header">
        <h3 className="card-title">💎 我的积分套餐</h3>
        <span className="subscription-badge">{pointsInfo.subscription_product}</span>
      </div>

      {/* 进度条 */}
      <div className="progress-section">
        <div className="progress-header">
          <span className="progress-label">当前使用进度</span>
          <span className="progress-percentage" style={{ color: getUsageColor(pointsInfo.usage_percentage) }}>
            {pointsInfo.usage_percentage.toFixed(1)}%
          </span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ 
              width: `${pointsInfo.usage_percentage}%`,
              background: getUsageColor(pointsInfo.usage_percentage)
            }}
          />
        </div>
        <div className="progress-info">
          <span>剩余: {formatNumber(pointsInfo.current_balance)}</span>
          <span>总额: {formatNumber(pointsInfo.total_allotment)}</span>
        </div>
      </div>

      {/* 统计数据 */}
      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-icon">📉</div>
          <div className="stat-content">
            <div className="stat-value">{formatNumber(pointsInfo.used_points)}</div>
            <div className="stat-label">已使用积分</div>
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <div className="stat-value">{formatNumber(pointsInfo.avg_per_day)}</div>
            <div className="stat-label">日均消耗</div>
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-value" style={{ color: getRemainingDaysColor(pointsInfo.remaining_days) }}>
              {pointsInfo.remaining_days > 999 ? '∞' : pointsInfo.remaining_days} 天
            </div>
            <div className="stat-label">预计可用</div>
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-icon">🔄</div>
          <div className="stat-content">
            <div className="stat-value renewal-date">
              {new Date(pointsInfo.next_grant_time / 1000).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
            </div>
            <div className="stat-label">下次重置</div>
          </div>
        </div>
      </div>

      {/* 费用统计 - 只有配置了订阅费用才显示 */}
      {subscriptionCostInfo && subscriptionCostInfo.subscription_amount > 0 && (
        <div className="cost-section">
          <div className="cost-header">
            <span className="cost-title">💵 费用统计</span>
            <span className="cost-subscription">
              {getCurrencySymbol(subscriptionCostInfo.subscription_currency)}
              {subscriptionCostInfo.subscription_amount}/月
              <span className="cost-usd-hint">
                (≈ {formatUSD(subscriptionCostInfo.subscription_amount_usd)})
              </span>
            </span>
          </div>
          <div className="cost-grid">
            <div className="cost-item">
              <div className="cost-value cost-used">
                {formatUSD(calculateUsedPointsValueUSD())}
              </div>
              <div className="cost-label">已消费 (USD)</div>
            </div>
            <div className="cost-item">
              <div className="cost-value cost-remaining">
                {formatUSD(subscriptionCostInfo.subscription_amount_usd - (calculateUsedPointsValueUSD() || 0))}
              </div>
              <div className="cost-label">剩余价值 (USD)</div>
            </div>
            <div className="cost-item">
              <div className="cost-value cost-per-point">
                ${subscriptionCostInfo.point_value_usd?.toFixed(6) || '0.000000'}
              </div>
              <div className="cost-label">单积分价值</div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default UserPointsCard;






