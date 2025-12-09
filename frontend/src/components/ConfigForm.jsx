import React, { useState } from 'react';
import { Card, Button, Input, Textarea } from './common';
import logger from '../logger';
import './ConfigForm.css';

// 支持的货币列表
const CURRENCIES = [
  { code: 'USD', name: '美元 (USD)', symbol: '$' },
  { code: 'HKD', name: '港币 (HKD)', symbol: 'HK$' },
  { code: 'CNY', name: '人民币 (CNY)', symbol: '¥' },
  { code: 'EUR', name: '欧元 (EUR)', symbol: '€' },
  { code: 'GBP', name: '英镑 (GBP)', symbol: '£' },
  { code: 'JPY', name: '日元 (JPY)', symbol: '¥' },
  { code: 'TWD', name: '新台币 (TWD)', symbol: 'NT$' },
];

const ConfigForm = ({ onFetch, loading }) => {
  const [config, setConfig] = useState({
    cookie: '',
    formKey: '',
    tchannel: '',
    revision: '59988163982a4ac4be7c7e7784f006dc48cafcf5',
    tagId: '8a0df086c2034f5e97dcb01c426029ee',
    subscriptionDay: 1,
    subscriptionAmount: 0,
    subscriptionCurrency: 'USD',
    autoFetchInterval: 30,
    autoFetchEnabled: false,
  });
  const [curlInput, setCurlInput] = useState('');
  const [showCurlInput, setShowCurlInput] = useState(false);
  const [autoFetchStatus, setAutoFetchStatus] = useState(null);

  // 加载保存的配置
  React.useEffect(() => {
    logger.info('ConfigForm: 开始加载保存的配置');
    fetch('http://localhost:58232/api/config')
      .then(res => {
        logger.api('ConfigForm: 配置接口响应', { status: res.status });
        return res.json();
      })
      .then(data => {
        logger.data('ConfigForm: 收到配置数据', data);
        // 只在有保存的配置时才加载（cookie 不为空说明有配置）
        if (data.cookie) {
          const newConfig = {
            cookie: data.cookie,
            formKey: data.form_key,
            tchannel: data.tchannel,
            revision: data.revision || '59988163982a4ac4be7c7e7784f006dc48cafcf5',
            tagId: data.tag_id || '8a0df086c2034f5e97dcb01c426029ee',
            subscriptionDay: data.subscription_day || 1,
            subscriptionAmount: data.subscription_amount || 0,
            subscriptionCurrency: data.subscription_currency || 'USD',
            autoFetchInterval: data.auto_fetch_interval || 30,
            autoFetchEnabled: data.auto_fetch_enabled || false,
          };
          logger.success('ConfigForm: 配置已加载', { 
            hasCookie: !!newConfig.cookie, 
            subscriptionDay: newConfig.subscriptionDay,
            subscriptionAmount: newConfig.subscriptionAmount,
            subscriptionCurrency: newConfig.subscriptionCurrency,
            autoFetchEnabled: newConfig.autoFetchEnabled
          });
          setConfig(newConfig);
        } else {
          logger.warning('ConfigForm: 暂无保存的配置，使用默认值');
        }
      })
      .catch(err => {
        logger.error('ConfigForm: 加载配置失败', err.message);
      });
  }, []);

  // 定期获取自动拉取状态
  React.useEffect(() => {
    const fetchStatus = () => {
      fetch('http://localhost:58232/api/auto-fetch-status')
        .then(res => res.json())
        .then(data => setAutoFetchStatus(data))
        .catch(err => console.error('获取状态失败:', err));
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // 每 10 秒更新一次
    return () => clearInterval(interval);
  }, []);

  // 解析 curl 命令
  const parseCurlCommand = (curlCommand) => {
    try {
      const newConfig = { ...config };
      
      // 移除换行符和多余空格，但保留 Cookie 中的内容
      const normalized = curlCommand.replace(/\\\s*\n\s*/g, ' ').trim();
      
      // 提取 cookie - 需要特殊处理，因为 Cookie 内部可能包含引号
      // 使用更智能的方式：找到 -b ' 开始，然后找到 ' -H 或 ' --data 结束
      let cookieMatch = normalized.match(/-b\s+'([^']+)'/);
      if (!cookieMatch) {
        // 尝试双引号格式
        cookieMatch = normalized.match(/-b\s+"([^"]+)"/);
      }
      if (!cookieMatch) {
        // 尝试 --cookie 格式
        cookieMatch = normalized.match(/--cookie\s+'([^']+)'/);
      }
      if (!cookieMatch) {
        cookieMatch = normalized.match(/--cookie\s+"([^"]+)"/);
      }
      if (!cookieMatch) {
        // 尝试 -H 'cookie: ...' 格式
        cookieMatch = normalized.match(/-H\s+'cookie:\s*([^']+)'/i);
      }
      if (!cookieMatch) {
        cookieMatch = normalized.match(/-H\s+"cookie:\s*([^"]+)"/i);
      }
      if (cookieMatch) {
        newConfig.cookie = cookieMatch[1].trim();
      }

      // 提取 poe-formkey
      const formkeyMatch = normalized.match(/-H\s+['"]poe-formkey:\s*([^'"]+)['"]/i);
      if (formkeyMatch) {
        newConfig.formKey = formkeyMatch[1].trim();
      }

      // 提取 poe-tchannel
      const tchannelMatch = normalized.match(/-H\s+['"]poe-tchannel:\s*([^'"]+)['"]/i);
      if (tchannelMatch) {
        newConfig.tchannel = tchannelMatch[1].trim();
      }

      // 提取 poe-revision
      const revisionMatch = normalized.match(/-H\s+['"]poe-revision:\s*([^'"]+)['"]/i);
      if (revisionMatch) {
        newConfig.revision = revisionMatch[1].trim();
      }

      // 提取 poe-tag-id
      const tagIdMatch = normalized.match(/-H\s+['"]poe-tag-id:\s*([^'"]+)['"]/i);
      if (tagIdMatch) {
        newConfig.tagId = tagIdMatch[1].trim();
      }

      return newConfig;
    } catch (error) {
      console.error('解析 curl 命令失败:', error);
      return null;
    }
  };

  const handleParseCurl = () => {
    logger.info('ConfigForm: 开始解析 curl 命令', { curlLength: curlInput.length });
    const parsed = parseCurlCommand(curlInput);
    if (parsed) {
      logger.success('ConfigForm: curl 解析成功', { 
        hasCookie: !!parsed.cookie,
        hasFormKey: !!parsed.formKey,
        hasTChannel: !!parsed.tchannel
      });
      setConfig(parsed);
      setShowCurlInput(false);
      setCurlInput('');
      alert('✅ 配置信息已自动填充！');
    } else {
      logger.error('ConfigForm: curl 解析失败');
      alert('❌ 解析失败，请检查 curl 命令格式是否正确');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // 先保存配置
    saveConfig();
    // 然后开始拉取
    onFetch(config);
  };

  const saveConfig = async () => {
    logger.info('ConfigForm: 保存配置', { 
      subscriptionDay: config.subscriptionDay,
      subscriptionAmount: config.subscriptionAmount,
      subscriptionCurrency: config.subscriptionCurrency
    });
    try {
      const response = await fetch('http://localhost:58232/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cookie: config.cookie,
          form_key: config.formKey,
          tchannel: config.tchannel,
          revision: config.revision,
          tag_id: config.tagId,
          subscription_day: config.subscriptionDay,
          subscription_amount: config.subscriptionAmount,
          subscription_currency: config.subscriptionCurrency,
          auto_fetch_interval: config.autoFetchInterval,
          auto_fetch_enabled: config.autoFetchEnabled,
        }),
      });
      
      if (response.ok) {
        logger.success('ConfigForm: 配置保存成功');
        alert('✅ 配置已保存！');
      }
    } catch (err) {
      logger.error('ConfigForm: 保存配置失败', err.message);
      alert('❌ 保存配置失败：' + err.message);
    }
  };

  const handleSaveConfigOnly = async (e) => {
    e.preventDefault();
    await saveConfig();
  };

  return (
    <Card className="config-form-card">
      <div className="form-header">
        <h3 className="form-title">🔧 配置信息</h3>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setShowCurlInput(!showCurlInput)}
          className="toggle-curl-btn"
        >
          {showCurlInput ? '📝 手动填写' : '⚡ 快速导入 (curl)'}
        </Button>
      </div>

      {showCurlInput && (
        <div className="curl-input-section">
          <div className="form-group">
            <label className="form-label">粘贴完整的 curl 命令</label>
            <Textarea
              value={curlInput}
              onChange={(e) => setCurlInput(e.target.value)}
              placeholder="curl 'https://poe.com/api/gql_POST' \
  -H 'cookie: ...' \
  -H 'poe-formkey: ...' \
  -H 'poe-tchannel: ...' \
  ..."
              rows={8}
            />
            <span className="form-hint">
              💡 在浏览器开发者工具中，右键点击请求 → Copy → Copy as cURL
            </span>
          </div>
          <Button
            type="button"
            variant="success"
            onClick={handleParseCurl}
            className="parse-btn"
            disabled={!curlInput.trim()}
          >
            🎯 解析并填充配置
          </Button>
          <div className="divider">或者手动填写 ↓</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="config-form">
        <div className="form-group">
          <label className="form-label">Cookie *</label>
          <Textarea
            value={config.cookie}
            onChange={(e) => setConfig({ ...config, cookie: e.target.value })}
            placeholder="粘贴完整的 Cookie 字符串"
            rows={3}
            required
          />
          <span className="form-hint">从浏览器开发者工具中复制完整的 Cookie</span>
        </div>

        <div className="form-group">
          <label className="form-label">Form Key *</label>
          <Input
            value={config.formKey}
            onChange={(e) => setConfig({ ...config, formKey: e.target.value })}
            placeholder="例如: 7d90e4070b0c6350901db420668d6a26"
            required
          />
          <span className="form-hint">请求头中的 poe-formkey</span>
        </div>

        <div className="form-group">
          <label className="form-label">TChannel *</label>
          <Input
            value={config.tchannel}
            onChange={(e) => setConfig({ ...config, tchannel: e.target.value })}
            placeholder="例如: poe-chan110-8888-npwpozikgkiyllvlxmcu"
            required
          />
          <span className="form-hint">请求头中的 poe-tchannel</span>
        </div>

        <div className="form-group">
          <label className="form-label">每月订阅日 (拉取数据的截止点)</label>
          <Input
            type="number"
            min="1"
            max="31"
            value={config.subscriptionDay}
            onChange={(e) => setConfig({ ...config, subscriptionDay: parseInt(e.target.value) || 1 })}
            placeholder="例如: 28"
          />
          <span className="form-hint">
            💡 设置你的 Poe 每月订阅日（1-31），如 28 表示每月 28 号重置积分
          </span>
        </div>

        <div className="subscription-cost-section">
          <h4 className="section-title">💰 订阅费用设置</h4>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">每月订阅金额</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={config.subscriptionAmount}
                onChange={(e) => setConfig({ ...config, subscriptionAmount: parseFloat(e.target.value) || 0 })}
                placeholder="例如: 399"
              />
              <span className="form-hint">
                输入你每月支付的订阅费用
              </span>
            </div>
            <div className="form-group">
              <label className="form-label">货币类型</label>
              <select
                value={config.subscriptionCurrency}
                onChange={(e) => setConfig({ ...config, subscriptionCurrency: e.target.value })}
                className="currency-select"
              >
                {CURRENCIES.map(currency => (
                  <option key={currency.code} value={currency.code}>
                    {currency.name}
                  </option>
                ))}
              </select>
              <span className="form-hint">
                选择你支付订阅费用的货币
              </span>
            </div>
          </div>
          <div className="form-hint subscription-hint">
            💡 设置订阅费用后，系统会自动计算你的积分消耗对应的美元价值
          </div>
        </div>

        <div className="auto-fetch-section">
          <h4 className="section-title">⏰ 自动增量拉取设置</h4>
          
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={config.autoFetchEnabled}
                onChange={(e) => setConfig({ ...config, autoFetchEnabled: e.target.checked })}
                className="checkbox-input"
              />
              <span>启用自动增量拉取</span>
            </label>
            <span className="form-hint">
              启用后将定时自动拉取最新数据（遇到重复停止）
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">拉取间隔（分钟）</label>
            <Input
              type="number"
              min="1"
              max="1440"
              value={config.autoFetchInterval}
              onChange={(e) => setConfig({ ...config, autoFetchInterval: parseInt(e.target.value) || 30 })}
              disabled={!config.autoFetchEnabled}
              placeholder="默认 30 分钟"
            />
            <span className="form-hint">
              建议设置 15-60 分钟，避免请求过于频繁
            </span>
          </div>

          {config.autoFetchEnabled && autoFetchStatus && (
            <div className="auto-fetch-status">
              <div className="status-item">
                <span className="status-label">运行状态：</span>
                <span className={`status-value ${autoFetchStatus.is_running ? 'running' : 'idle'}`}>
                  {autoFetchStatus.is_running ? '🔄 拉取中...' : '✅ 空闲'}
                </span>
              </div>
              {autoFetchStatus.last_fetch_time && (
                <div className="status-item">
                  <span className="status-label">上次拉取：</span>
                  <span className="status-value">
                    {new Date(autoFetchStatus.last_fetch_time).toLocaleString('zh-CN')}
                  </span>
                </div>
              )}
              {autoFetchStatus.last_fetch_result && (
                <div className="status-item">
                  <span className="status-label">拉取结果：</span>
                  <span className="status-value">{autoFetchStatus.last_fetch_result}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Revision (可选)</label>
            <Input
              value={config.revision}
              onChange={(e) => setConfig({ ...config, revision: e.target.value })}
              placeholder="默认值已填充"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tag ID (可选)</label>
            <Input
              value={config.tagId}
              onChange={(e) => setConfig({ ...config, tagId: e.target.value })}
              placeholder="默认值已填充"
            />
          </div>
        </div>

        <Button 
          type="button" 
          variant="secondary" 
          disabled={loading}
          className="save-config-btn"
          onClick={handleSaveConfigOnly}
        >
          💾 保存配置
        </Button>

        <div className="button-group-full">
          <Button type="submit" variant="primary" disabled={loading} className="submit-btn">
            {loading ? '拉取中...' : '🚀 增量拉取'}
          </Button>
          <Button 
            type="button" 
            variant="success" 
            disabled={loading}
            className="submit-btn"
            onClick={() => {
              const form = document.querySelector('.config-form');
              if (form.reportValidity()) {
                saveConfig();
                onFetch(config, true); // true 表示全量拉取
              }
            }}
          >
            {loading ? '拉取中...' : '🔄 全量拉取'}
          </Button>
        </div>
      </form>

      <div className="help-section">
        <h4 className="help-title">💡 如何获取配置信息？</h4>
        <ol className="help-list">
          <li>打开浏览器，访问 <code>https://poe.com/points_history</code></li>
          <li>按 F12 打开开发者工具，切换到 Network 标签</li>
          <li>刷新页面，找到 <code>gql_POST</code> 请求</li>
          <li>在 Request Headers 中找到所需的字段值</li>
        </ol>
      </div>
    </Card>
  );
};

export default ConfigForm;

