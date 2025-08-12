const fs = require('fs');
const fetch = require('node-fetch');

const API_URL = 'https://fapi.binance.com/fapi/v1/ticker/24hr';
const DATA_FILE_PATH = 'data/dashboard_data.json';

async function run() {
    console.log('开始采集数据...');
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`币安API请求失败: ${response.statusText}`);
        const tickers = await response.json();

        // --- 开始进行数据分析 ---
        const usdtPairs = tickers
            .filter(t => t.symbol.endsWith('USDT') && !t.symbol.includes('_'))
            .sort((a, b) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent));

        const topGainers = usdtPairs.slice(0, 20);
        const gainers = usdtPairs.filter(t => parseFloat(t.priceChangePercent) > 0);
        const marketSentiment = (gainers.length / usdtPairs.length) * 100;
        const ethTicker = tickers.find(t => t.symbol === 'ETHUSDT');
        const ethChange = ethTicker ? parseFloat(ethTicker.priceChangePercent) : null;
        // --- 数据分析结束 ---

        // 准备要存入文件的新数据
        const newData = {
            lastUpdated: new Date().toISOString(),
            marketSentiment: marketSentiment,
            ethChange: ethChange,
            topGainers: topGainers.map(t => ({ // 只保留需要的数据，减小文件体积
                symbol: t.symbol,
                lastPrice: t.lastPrice,
                priceChangePercent: t.priceChangePercent
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
