import React from 'react';
import './TabBar.css';

const TabBar = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'dashboard', label: '仪表盘', icon: '📊' },
    { id: 'table', label: '数据表格', icon: '📋' },
    { id: 'settings', label: '配置', icon: '⚙️' }
  ];

  return (
    <div className="tab-bar">
      <div className="tab-bar-inner">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
            {activeTab === tab.id && <div className="tab-indicator" />}
          </button>
        ))}
      </div>
      <div className="tab-bar-title">
        <span className="title-icon">🔮</span>
        <span className="title-text">Poe 积分监控</span>
      </div>
      <div className="tab-bar-actions">
        {/* 可以放置全局操作按钮 */}
      </div>
    </div>
  );
};

export default TabBar;
