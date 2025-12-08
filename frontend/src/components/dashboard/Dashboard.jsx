import React, { useEffect, useRef, useCallback } from 'react';
import { GridStack } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';
import './Dashboard.css';
import logger from '../../logger';

const Dashboard = ({ items, onLayoutChange, savedLayout }) => {
  const gridRef = useRef(null);
  const gridInstance = useRef(null);
  const isInitialized = useRef(false);
  const widgetRefs = useRef({});

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
      
      // 🔍 调试：打印设置的属性
      console.log(`[DEBUG] Widget ${item.id} 属性设置:`, {
        'gs-x': merged.x,
        'gs-y': merged.y,
        'gs-w': merged.w,
        'gs-h': merged.h,
        element: el,
      });
    }
  }, [savedLayout]);

  // 初始化 GridStack
  useEffect(() => {
    // 使用 requestAnimationFrame 确保 DOM 完全渲染
    let rafId;
    const initGrid = () => {
      if (!gridRef.current || isInitialized.current) return;

      // 检查所有 widget 是否都已设置好属性
      const gridItems = gridRef.current.querySelectorAll('.grid-stack-item');
      const allReady = Array.from(gridItems).every(el => el.hasAttribute('gs-w'));
      
      if (!allReady || gridItems.length !== items.length) {
        // 还没准备好，继续等待
        rafId = requestAnimationFrame(initGrid);
        return;
      }

      // 🔍 调试：打印初始化前的 DOM 状态
      console.log('[DEBUG] GridStack 初始化前 DOM 状态:');
      gridItems.forEach((el, i) => {
        console.log(`  Widget ${i}:`, {
          id: el.getAttribute('gs-id'),
          x: el.getAttribute('gs-x'),
          y: el.getAttribute('gs-y'),
          w: el.getAttribute('gs-w'),
          h: el.getAttribute('gs-h'),
          style: el.getAttribute('style'),
        });
      });

      // 🔍 调试：打印容器信息
      const containerRect = gridRef.current.getBoundingClientRect();
      console.log('[DEBUG] Grid 容器尺寸:', {
        width: containerRect.width,
        height: containerRect.height,
        computedStyle: window.getComputedStyle(gridRef.current),
      });

      logger.info('Dashboard: 初始化 GridStack', { itemCount: gridItems.length });

      // 初始化 GridStack
      gridInstance.current = GridStack.init({
        column: 12,
        cellHeight: 100,
        minRow: 1,
        margin: 20,
        float: true,
        disableOneColumnMode: true,
        animate: true,
        staticGrid: false,
      }, gridRef.current);

      // 🔍 调试：打印 GridStack 实例信息
      console.log('[DEBUG] GridStack 实例:', gridInstance.current);
      console.log('[DEBUG] GridStack opts:', gridInstance.current.opts);

      // 让 GridStack 识别已有的 DOM 元素
      gridItems.forEach((el) => {
        const widget = gridInstance.current.makeWidget(el);
        console.log('[DEBUG] makeWidget 结果:', {
          id: el.getAttribute('gs-id'),
          widget: widget,
          gridstackNode: el.gridstackNode,
        });
      });

      // 🔍 调试：打印初始化后的状态
      console.log('[DEBUG] GridStack 初始化后:');
      console.log('  - getGridItems:', gridInstance.current.getGridItems());
      console.log('  - save():', gridInstance.current.save(false));
      
      // 🔍 调试：检查 CSS 变量
      const gridStyle = window.getComputedStyle(gridRef.current);
      console.log('[DEBUG] Grid CSS 变量:', {
        '--gs-column-width': gridStyle.getPropertyValue('--gs-column-width'),
        '--gs-cell-height': gridStyle.getPropertyValue('--gs-cell-height'),
        '--gs-item-margin-top': gridStyle.getPropertyValue('--gs-item-margin-top'),
      });

      // 🔍 调试：检查第一个 widget 的计算样式
      if (gridItems[0]) {
        const itemStyle = window.getComputedStyle(gridItems[0]);
        console.log('[DEBUG] 第一个 Widget 计算样式:', {
          position: itemStyle.position,
          left: itemStyle.left,
          top: itemStyle.top,
          width: itemStyle.width,
          height: itemStyle.height,
        });
      }

      logger.info('Dashboard: GridStack 初始化完成', { widgetCount: gridItems.length });

      // 监听变化并保存
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
  }, [items.length]);

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

  return (
    <div className="grid-stack" ref={gridRef}>
      {items.map((item) => (
        <div 
          key={item.id}
          ref={(el) => setWidgetRef(el, item)}
          className="grid-stack-item"
        >
          <div className="grid-stack-item-content card-container">
            {item.content}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Dashboard;





