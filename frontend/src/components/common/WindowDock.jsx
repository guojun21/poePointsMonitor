import React from 'react';
import './WindowDock.css';

/**
 * Mac风格窗口暂存栏（Dock）
 * 显示最小化的窗口，点击可还原
 */
const WindowDock = ({ minimizedWindows = [], onRestore }) => {
  if (minimizedWindows.length === 0) {
    return null;
  }

  return (
    <div className="window-dock">
      <div className="dock-container">
        {minimizedWindows.map((window) => (
          <div
            key={window.id}
            className="dock-item"
            onClick={() => onRestore(window.id)}
            title={`点击还原: ${window.title}`}
          >
            <div className="dock-item-preview">
              <span className="dock-item-icon">{window.icon || '📦'}</span>
            </div>
            <span className="dock-item-title">{window.title}</span>
            <div className="dock-item-indicator" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default WindowDock;
