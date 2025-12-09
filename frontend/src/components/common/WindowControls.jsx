import React, { useState } from 'react';
import './WindowControls.css';

/**
 * Mac风格窗口控制按钮
 * - 红色：关闭（目前功能同最小化）
 * - 黄色：最小化到暂存栏
 * - 绿色：最大化/还原
 * - 蓝色：刷新（重新加载数据）
 */
const WindowControls = ({ 
  onClose, 
  onMinimize, 
  onMaximize, 
  onRefresh,
  isMaximized = false,
  title = '',
  showTitle = true,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="window-controls"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="traffic-lights">
        {/* 关闭按钮 - 红色 */}
        <button 
          className="traffic-light close"
          onClick={onClose}
          title="关闭"
        >
          {isHovered && (
            <svg viewBox="0 0 12 12" className="icon">
              <path d="M3.5 3.5l5 5M8.5 3.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )}
        </button>
        
        {/* 最小化按钮 - 黄色 */}
        <button 
          className="traffic-light minimize"
          onClick={onMinimize}
          title="最小化"
        >
          {isHovered && (
            <svg viewBox="0 0 12 12" className="icon">
              <path d="M2.5 6h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )}
        </button>
        
        {/* 最大化按钮 - 绿色 */}
        <button 
          className="traffic-light maximize"
          onClick={onMaximize}
          title={isMaximized ? "还原" : "最大化"}
        >
          {isHovered && (
            <svg viewBox="0 0 12 12" className="icon">
              {isMaximized ? (
                // 还原图标 - 两个重叠的小矩形
                <>
                  <rect x="3" y="4.5" width="5" height="4.5" fill="none" stroke="currentColor" strokeWidth="1" rx="0.5"/>
                  <path d="M4.5 4.5V3.5a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1" stroke="currentColor" strokeWidth="1" fill="none"/>
                </>
              ) : (
                // 最大化图标 - 对角线箭头
                <>
                  <path d="M2.5 9.5l7-7M9.5 2.5v4M9.5 2.5h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </>
              )}
            </svg>
          )}
        </button>
        
        {/* 刷新按钮 - 蓝色 */}
        <button 
          className="traffic-light refresh"
          onClick={onRefresh}
          title="刷新"
        >
          {isHovered && (
            <svg viewBox="0 0 12 12" className="icon">
              <path 
                d="M2.5 6a3.5 3.5 0 016.5-1.75M9.5 6a3.5 3.5 0 01-6.5 1.75" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round"
                fill="none"
              />
              <path d="M9 2v2.25H6.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <path d="M3 10V7.75h2.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          )}
        </button>
      </div>
      
      {showTitle && title && (
        <span className="window-title">{title}</span>
      )}
    </div>
  );
};

export default WindowControls;

