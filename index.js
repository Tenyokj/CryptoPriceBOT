require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const lastRequestTime = {};

bot.onText(/\/price(?: (.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const symbol = match[1]?.toLowerCase();

  if (!symbol) {
    return bot.sendMessage(chatId, '❌ Please specify a cryptocurrency. Example: `/price bitcoin`', { parse_mode: 'Markdown' });
  }

  // Rate limiting
  if (lastRequestTime[chatId] && Date.now() - lastRequestTime[chatId] < 5000) {
    return bot.sendMessage(chatId, '⚠️ Please wait 5 seconds between requests.');
  }
  lastRequestTime[chatId] = Date.now();

  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(symbol)}`);
    
    if (!res.ok) {
      throw new Error(`CoinGecko API error: ${res.status}`);
    }

    const data = await res.json();
    if (!data.length) {
      return bot.sendMessage(chatId, '❌ Cryptocurrency not found. Try symbols like `bitcoin`, `ethereum`, `solana`', { parse_mode: 'Markdown' });
    }

    const coin = data[0];
    const change24h = coin.price_change_percentage_24h;
    const changeIcon = change24h >= 0 ? '🟢' : '🔴';

    const reply = `💰 *${coin.name}* (${coin.symbol.toUpperCase()})\n` +
                  `Price: **$${coin.current_price.toLocaleString(undefined, { maximumFractionDigits: 6 })}**\n` +
                  `24h Change: ${changeIcon} **${change24h.toFixed(2)}%**`;

    await bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error fetching ${symbol}:`, err.message);
    await bot.sendMessage(chatId, '⚠️ Something went wrong. Please try again later.');
  }
});

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Welcome! Use `/price <crypto_id>` to get the current price.\nExample: `/price bitcoin`', { parse_mode: 'Markdown' });
});