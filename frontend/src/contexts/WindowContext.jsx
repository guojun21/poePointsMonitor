import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * 窗口管理上下文
 * 管理所有卡片窗口的状态：最小化、最大化、刷新等
 */
const WindowContext = createContext(null);

// 窗口配置映射
const WINDOW_CONFIG = {
  'user-points': { title: '用户积分', icon: '💰' },
  'bot-stats': { title: '机器人统计', icon: '🤖' },
  'total-stats': { title: '总体统计', icon: '📊' },
  'chart': { title: '积分消耗趋势', icon: '📈' },
};

export const WindowProvider = ({ children, onRefresh }) => {
  // 最小化的窗口列表
  const [minimizedWindows, setMinimizedWindows] = useState([]);
  // 最大化的窗口ID
  const [maximizedWindow, setMaximizedWindow] = useState(null);
  // 窗口可见性
  const [windowVisibility, setWindowVisibility] = useState({});

  // 最小化窗口
  const minimizeWindow = useCallback((windowId) => {
    const config = WINDOW_CONFIG[windowId] || { title: windowId, icon: '📦' };
    setMinimizedWindows(prev => {
      // 避免重复添加
      if (prev.some(w => w.id === windowId)) return prev;
      return [...prev, { id: windowId, ...config }];
    });
    setWindowVisibility(prev => ({ ...prev, [windowId]: false }));
    // 如果当前是最大化状态，取消最大化
    if (maximizedWindow === windowId) {
      setMaximizedWindow(null);
    }
  }, [maximizedWindow]);

  // 关闭窗口（目前功能同最小化）
  const closeWindow = useCallback((windowId) => {
    minimizeWindow(windowId);
  }, [minimizeWindow]);

  // 还原窗口
  const restoreWindow = useCallback((windowId) => {
    setMinimizedWindows(prev => prev.filter(w => w.id !== windowId));
    setWindowVisibility(prev => ({ ...prev, [windowId]: true }));
  }, []);

  // 最大化/还原窗口
  const toggleMaximize = useCallback((windowId) => {
    if (maximizedWindow === windowId) {
      setMaximizedWindow(null);
    } else {
      setMaximizedWindow(windowId);
      // 如果窗口是最小化状态，先还原
      setMinimizedWindows(prev => prev.filter(w => w.id !== windowId));
      setWindowVisibility(prev => ({ ...prev, [windowId]: true }));
    }
  }, [maximizedWindow]);

  // 刷新窗口内容
  const refreshWindow = useCallback((windowId) => {
    if (onRefresh) {
      onRefresh(windowId);
    }
  }, [onRefresh]);

  // 检查窗口是否可见
  const isWindowVisible = useCallback((windowId) => {
    return windowVisibility[windowId] !== false;
  }, [windowVisibility]);

  // 检查窗口是否最大化
  const isWindowMaximized = useCallback((windowId) => {
    return maximizedWindow === windowId;
  }, [maximizedWindow]);

  const value = {
    minimizedWindows,
    maximizedWindow,
    minimizeWindow,
    closeWindow,
    restoreWindow,
    toggleMaximize,
    refreshWindow,
    isWindowVisible,
    isWindowMaximized,
    WINDOW_CONFIG,
  };

  return (
    <WindowContext.Provider value={value}>
      {children}
    </WindowContext.Provider>
  );
};

export const useWindowManager = () => {
  const context = useContext(WindowContext);
  if (!context) {
    throw new Error('useWindowManager must be used within a WindowProvider');
  }
  return context;
};

export default WindowContext;
