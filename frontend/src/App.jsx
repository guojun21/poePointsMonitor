import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Navbar,
  Footer,
  PageContainer,
  ConfigForm,
  PointsChart,
  TotalStatsCard,
  BotStatsCard,
  UserPointsCard,
  Dashboard,
} from './components';
import logger from './logger';
import './App.css';

const API_BASE = 'http://localhost:58232/api';

function App() {
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [botStats, setBotStats] = useState([]);
  const [totalStats, setTotalStats] = useState({
    totalCost: 0,
    totalCount: 0,
    avgCost: 0,
  });
  const [granularity, setGranularity] = useState('hour');
  const [chartType, setChartType] = useState('discrete');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [periodOffset, setPeriodOffset] = useState(0);
  const [periodLabel, setPeriodLabel] = useState('');
  const [savedLayout, setSavedLayout] = useState([]); // 保存的布局数据

  // 拉取数据
  const handleFetch = async (config, fullSync = false) => {
    setLoading(true);
    logger.info(`开始${fullSync ? '全量' : '增量'}拉取数据`, { subscriptionDay: config.subscriptionDay });
    
    try {
      const response = await axios.post(`${API_BASE}/fetch`, {
        cookie: config.cookie,
        form_key: config.formKey,
        tchannel: config.tchannel,
        revision: config.revision,
        tag_id: config.tagId,
        subscription_day: config.subscriptionDay,
        full_sync: fullSync,
      });

      logger.success('数据拉取成功', response.data);

      let message = `成功拉取 ${response.data.new_records} 条新记录！`;
      if (response.data.updated_records > 0) {
        message += `\n更新了 ${response.data.updated_records} 条已有记录！`;
      }
      alert(message);
      
      // 刷新统计数据
      logger.info('刷新统计数据...');
      await fetchStats();
      await fetchBotStats();
      setRefreshTrigger(prev => prev + 1); // 触发积分卡片刷新
    } catch (error) {
      logger.error('拉取数据失败', { error: error.message, response: error.response?.data });
      alert('拉取数据失败：' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  // 获取统计数据
  const fetchStats = async () => {
    logger.api('获取统计数据', { granularity, chartType, periodOffset });
    try {
      const response = await axios.get(`${API_BASE}/stats`, {
        params: {
          granularity: granularity,
          type: chartType,
          period: periodOffset,
        },
      });
      
      const statsData = response.data.data || [];
      setChartData(statsData);
      setPeriodLabel(response.data.period_label || '');
      
      logger.data('统计数据获取成功', { 
        dataPoints: statsData.length, 
        periodLabel: response.data.period_label 
      });
      
      // 计算总体统计
      if (statsData && statsData.length > 0) {
        const total = statsData.reduce((sum, item) => sum + item.point_cost, 0);
        const count = statsData.reduce((sum, item) => sum + item.record_count, 0);
        setTotalStats({
          totalCost: chartType === 'cumulative' ? statsData[statsData.length - 1].point_cost : total,
          totalCount: chartType === 'cumulative' ? statsData[statsData.length - 1].record_count : count,
          avgCost: count > 0 ? Math.round((chartType === 'cumulative' ? statsData[statsData.length - 1].point_cost : total) / count) : 0,
        });
      }
    } catch (error) {
      logger.error('获取统计数据失败', error.message);
    }
  };

  // 获取机器人统计
  const fetchBotStats = async () => {
    logger.api('获取机器人统计');
    try {
      const response = await axios.get(`${API_BASE}/bot-stats`);
      setBotStats(response.data || []);
      logger.data('机器人统计获取成功', { count: response.data?.length || 0 });
    } catch (error) {
      logger.error('获取机器人统计失败', error.message);
    }
  };

  // 当粒度、图表类型或周期改变时重新获取数据
  useEffect(() => {
    fetchStats();
  }, [granularity, chartType, periodOffset]);

  // 初始加载
  useEffect(() => {
    logger.info('========== 应用启动 ==========');
    logger.info('初始化加载所有数据...');
    fetchStats();
    fetchBotStats();
    loadLayoutConfig();
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // 加载布局配置
  const loadLayoutConfig = async () => {
    logger.api('加载布局配置');
    try {
      const response = await axios.get(`${API_BASE}/layout`);
      if (response.data.grid_layout) {
        setSavedLayout(response.data.grid_layout);
        logger.success('布局配置加载成功');
      }
    } catch (error) {
      logger.error('加载布局配置失败', error.message);
    }
  };

  // 保存布局配置
  const handleLayoutChange = async (newLayout) => {
    logger.info('保存布局配置');
    try {
      await axios.post(`${API_BASE}/layout`, {
        grid_layout: newLayout,
      });
      logger.success('布局配置已保存');
    } catch (error) {
      logger.error('保存布局配置失败', error.message);
    }
  };

  // 默认布局项
  // 右侧: user-points(h=3) + stats(h=3) + chart(h=5) = 11，左侧 config(h=11)
  const dashboardItems = [
    {
      id: 'config',
      x: 0, y: 0, w: 4, h: 11, minW: 3, minH: 8,
      content: <ConfigForm onFetch={handleFetch} loading={loading} />
    },
    {
      id: 'user-points',
      x: 4, y: 0, w: 8, h: 3, minW: 4, minH: 2,
      content: <UserPointsCard refreshTrigger={refreshTrigger} />
    },
    {
      id: 'bot-stats',
      x: 4, y: 3, w: 4, h: 3, minW: 2, minH: 2,
      content: <BotStatsCard botStats={botStats} />
    },
    {
      id: 'total-stats',
      x: 8, y: 3, w: 4, h: 3, minW: 2, minH: 2,
      content: <TotalStatsCard totalStats={totalStats} />
    },
    {
      id: 'chart',
      x: 4, y: 6, w: 8, h: 5, minW: 4, minH: 3,
      content: (
        <PointsChart
          data={chartData}
          granularity={granularity}
          chartType={chartType}
          periodOffset={periodOffset}
          periodLabel={periodLabel}
          onGranularityChange={setGranularity}
          onChartTypeChange={setChartType}
          onPeriodChange={setPeriodOffset}
        />
      )
    }
  ];

  return (
    <div className="app">
      <Navbar />
      
      <PageContainer>
        <Dashboard 
          items={dashboardItems} 
          onLayoutChange={handleLayoutChange}
          savedLayout={savedLayout}
        />
      </PageContainer>

      <Footer />
    </div>
  );
}

export default App;

