const fs = require('fs');
const fetch = require('node-fetch');

// 币安的API地址
const BINANCE_API_URL = 'https://api.binance.com/api/v3/ticker/24hr';
// 一个公共代理服务器的地址
const PROXY_URL = 'https://api.codetabs.com/v1/proxy?quest=';

// 最终请求的地址是代理+币安地址
const FINAL_API_URL = PROXY_URL + BINANCE_API_URL;

const DATA_FILE_PATH = 'data/dashboard_data.json';

async function run() {
    console.log(`开始通过代理采集数据... 请求地址: ${FINAL_API_URL}`);
    try {
        const response = await fetch(FINAL_API_URL);
        if (!response.ok) throw new Error(`代理或币安API请求失败: ${response.statusText}`);
        const tickers = await response.json();

        // 确保返回的是一个数组
        if (!Array.isArray(tickers)) {
            throw new Error('从API返回的数据不是一个有效的列表');
        }

        // --- 开始进行数据分析 ---
        const usdtPairs = tickers
            .filter(t => t.symbol.endsWith('USDT') && !t.symbol.includes('_'))
            .sort((a, b) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent));

        const topGainers = usdtPairs.slice(0, 20);
        const gainers = usdtPairs.filter(t => parseFloat(t.priceChangePercent) > 0);
        const marketSentiment = (usdtPairs.length > 0) ? (gainers.length / usdtPairs.length) * 100 : 0;
        const ethTicker = tickers.find(t => t.symbol === 'ETHUSDT');
        const ethChange = ethTicker ? parseFloat(ethTicker.priceChangePercent) : null;
        // --- 数据分析结束 ---

        // 准备要存入文件的新数据
        const newData = {
            lastUpdated: new Date().toISOString(),
            marketSentiment: marketSentiment,
            ethChange: ethChange,
            topGainers: topGainers.map(t => ({ 
                symbol: t.symbol,
                lastPrice: t.lastPrice,
                priceChangePercent: t.priceChangePercent
            })),
            // 新增：保存所有币种的简洁列表，用于更新持仓价格
            allTickers: usdtPairs.map(t => ({
                symbol: t.symbol,
                lastPrice: t.lastPrice
            }))
        };

        fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(newData, null, 2));
        console.log('数据采集并写入成功！');

    } catch (error) {
        console.error('采集脚本运行出错:', error);
        process.exit(1); // 退出并标记为失败
    }
}

run();
