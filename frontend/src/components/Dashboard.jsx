import React, { useEffect, useRef, useCallback, useState } from 'react';
import { GridStack } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';
import './Dashboard.css';
import logger from '../logger';
import { WindowControls, WindowDock } from './common';

// 窗口配置映射
const WINDOW_CONFIG = {
  'user-points': { title: '用户积分', icon: '💰' },
  'bot-stats': { title: '机器人统计', icon: '🤖' },
  'total-stats': { title: '总体统计', icon: '📊' },
  'chart': { title: '积分消耗趋势', icon: '📈' },
};

const Dashboard = ({ items, onLayoutChange, savedLayout, onRefresh }) => {
  const gridRef = useRef(null);
  const gridInstance = useRef(null);
  const isInitialized = useRef(false);
  const widgetRefs = useRef({});
  
  // 窗口状态管理
  const [minimizedWindows, setMinimizedWindows] = useState([]);
  const [maximizedWindow, setMaximizedWindow] = useState(null);
  const [hiddenWindows, setHiddenWindows] = useState(new Set());

  // 验证单个布局项是否有效
  const isValidLayoutItem = (item) => {
    return item && 
      typeof item.w === 'number' && item.w >= 1 &&
      typeof item.h === 'number' && item.h >= 1 &&
      typeof item.x === 'number' && item.x >= 0 &&
      typeof item.y === 'number' && item.y >= 0;
  };

  // 验证布局数据是否有效
  const isValidLayout = (layout) => {
    if (!layout || !Array.isArray(layout) || layout.length === 0) {
      return false;
    }
    return layout.some(item => isValidLayoutItem(item));
  };

  // 获取合并后的布局项
  const getMergedItem = (defaultItem) => {
    if (!isValidLayout(savedLayout)) {
      return defaultItem;
    }
    const savedItem = savedLayout.find(s => s.id === defaultItem.id);
    if (savedItem && isValidLayoutItem(savedItem)) {
      return {
        ...defaultItem,
        x: savedItem.x,
        y: savedItem.y,
        w: Math.max(savedItem.w, defaultItem.minW || 1),
        h: Math.max(savedItem.h, defaultItem.minH || 1),
      };
    }
    return defaultItem;
  };

  // 最小化窗口
  const handleMinimize = useCallback((windowId) => {
    const config = WINDOW_CONFIG[windowId] || { title: windowId, icon: '📦' };
    setMinimizedWindows(prev => {
      if (prev.some(w => w.id === windowId)) return prev;
      return [...prev, { id: windowId, ...config }];
    });
    setHiddenWindows(prev => new Set([...prev, windowId]));
    if (maximizedWindow === windowId) {
      setMaximizedWindow(null);
    }
  }, [maximizedWindow]);

  // 关闭窗口（目前功能同最小化）
  const handleClose = useCallback((windowId) => {
    handleMinimize(windowId);
  }, [handleMinimize]);

  // 还原窗口
  const handleRestore = useCallback((windowId) => {
    setMinimizedWindows(prev => prev.filter(w => w.id !== windowId));
    setHiddenWindows(prev => {
      const newSet = new Set(prev);
      newSet.delete(windowId);
      return newSet;
    });
  }, []);

  // 最大化/还原窗口
  const handleMaximize = useCallback((windowId) => {
    if (maximizedWindow === windowId) {
      setMaximizedWindow(null);
    } else {
      setMaximizedWindow(windowId);
      // 如果窗口是最小化状态，先还原
      setMinimizedWindows(prev => prev.filter(w => w.id !== windowId));
      setHiddenWindows(prev => {
        const newSet = new Set(prev);
        newSet.delete(windowId);
        return newSet;
      });
    }
  }, [maximizedWindow]);

  // 刷新窗口
  const handleRefresh = useCallback((windowId) => {
    if (onRefresh) {
      onRefresh(windowId);
    }
  }, [onRefresh]);

  // ref callback - 在元素挂载时立即设置属性
  const setWidgetRef = useCallback((el, item) => {
    if (el) {
      const merged = getMergedItem(item);
      el.setAttribute('gs-id', item.id);
      el.setAttribute('gs-x', String(merged.x));
      el.setAttribute('gs-y', String(merged.y));
      el.setAttribute('gs-w', String(merged.w));
      el.setAttribute('gs-h', String(merged.h));
      if (item.minW) el.setAttribute('gs-min-w', String(item.minW));
      if (item.minH) el.setAttribute('gs-min-h', String(item.minH));
      widgetRefs.current[item.id] = el;
    }
  }, [savedLayout]);

  // 初始化 GridStack
  useEffect(() => {
    let rafId;
    const initGrid = () => {
      if (!gridRef.current || isInitialized.current) return;

      const gridItems = gridRef.current.querySelectorAll('.grid-stack-item');
      const allReady = Array.from(gridItems).every(el => el.hasAttribute('gs-w'));
      
      if (!allReady || gridItems.length !== items.filter(i => !hiddenWindows.has(i.id)).length) {
        rafId = requestAnimationFrame(initGrid);
        return;
      }

      logger.info('Dashboard: 初始化 GridStack', { itemCount: gridItems.length });

      gridInstance.current = GridStack.init({
        column: 12,
        cellHeight: 80,
        minRow: 1,
        margin: 0,
        float: true,
        disableOneColumnMode: true,
        animate: true,
        staticGrid: false,
        disableResize: false,
        resizable: {
          handles: 'se'
        },
        compact: false,
      }, gridRef.current);

      gridItems.forEach((el) => {
        gridInstance.current.makeWidget(el);
      });

      logger.info('Dashboard: GridStack 初始化完成', { widgetCount: gridItems.length });

      gridInstance.current.on('change', (event, changedItems) => {
        const currentLayout = gridInstance.current.save(false);
        logger.debug('Dashboard: 布局发生变化', currentLayout);
        if (onLayoutChange) {
          onLayoutChange(currentLayout);
        }
      });

      isInitialized.current = true;
    };

    rafId = requestAnimationFrame(initGrid);

    return () => {
      cancelAnimationFrame(rafId);
      if (gridInstance.current) {
        gridInstance.current.destroy(false);
        gridInstance.current = null;
        isInitialized.current = false;
      }
    };
  }, [items.length, hiddenWindows.size]);

  // 当 savedLayout 从后端加载完成后，更新布局位置
  useEffect(() => {
    if (!gridInstance.current || !isInitialized.current) return;
    if (!isValidLayout(savedLayout)) {
      return;
    }

    logger.info('Dashboard: 应用保存的布局位置');
    
    gridInstance.current.batchUpdate();
    items.forEach((defaultItem) => {
      const savedItem = savedLayout.find(s => s.id === defaultItem.id);
      const el = widgetRefs.current[defaultItem.id];
      
      if (el && savedItem && isValidLayoutItem(savedItem)) {
        gridInstance.current.update(el, {
          x: savedItem.x,
          y: savedItem.y,
          w: Math.max(savedItem.w, defaultItem.minW || 1),
          h: Math.max(savedItem.h, defaultItem.minH || 1),
        });
      }
    });
    gridInstance.current.batchUpdate(false);
  }, [savedLayout, items]);

  // 获取可见的items
  const visibleItems = items.filter(item => !hiddenWindows.has(item.id));

  return (
    <>
      {/* 最大化窗口覆盖层 */}
      {maximizedWindow && (
        <div className="maximized-overlay">
          {items.filter(item => item.id === maximizedWindow).map(item => {
            const config = WINDOW_CONFIG[item.id] || { title: item.id, icon: '📦' };
            return (
              <div key={item.id} className="maximized-window">
                <WindowControls
                  title={config.title}
                  showTitle={true}
                  isMaximized={true}
                  onClose={() => handleClose(item.id)}
                  onMinimize={() => handleMinimize(item.id)}
                  onMaximize={() => handleMaximize(item.id)}
                  onRefresh={() => handleRefresh(item.id)}
                />
                <div className="maximized-content">
                  {item.content}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 正常GridStack布局 */}
      <div 
        className={`grid-stack ${maximizedWindow ? 'hidden' : ''}`} 
        ref={gridRef}
      >
        {visibleItems.map((item) => {
          const config = WINDOW_CONFIG[item.id] || { title: item.id, icon: '📦' };
          return (
            <div 
              key={item.id}
              ref={(el) => setWidgetRef(el, item)}
              className="grid-stack-item"
            >
              <div className="grid-stack-item-content card-container">
                <WindowControls
                  title={config.title}
                  showTitle={true}
                  isMaximized={false}
                  onClose={() => handleClose(item.id)}
                  onMinimize={() => handleMinimize(item.id)}
                  onMaximize={() => handleMaximize(item.id)}
                  onRefresh={() => handleRefresh(item.id)}
                />
                <div className="card-body">
                  {item.content}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部暂存栏 */}
      <WindowDock 
        minimizedWindows={minimizedWindows}
        onRestore={handleRestore}
      />
    </>
  );
};

export default Dashboard;
