import { createClient } from 'redis';

// Ở local không có docker thì host thường là 'localhost'
const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const redisUrl = `redis://${REDIS_HOST}:${REDIS_PORT}`;

console.log(`🔄 Đang khởi tạo Redis client tại: ${redisUrl}`);

const redisClient = createClient({
  url: redisUrl,

  socket: {
    connectTimeout: 5000,
    reconnectStrategy: (retries) => {
      if (retries > 5) return new Error('Retry time exhausted');
      return Math.min(retries * 50, 500);
    },
  },
});

redisClient.on('connect', () => console.log(`✅ Đang kết nối đến Redis...`));
redisClient.on('ready', () =>
  console.log('🚀 Redis client đã sẵn sàng (ready).'),
);

redisClient.on('error', (err) => {});

redisClient.on('end', () => console.log('zzZ Đã ngắt kết nối khỏi Redis.'));

(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.warn(
      '⚠️ KHÔNG THỂ KẾT NỐI REDIS. App sẽ chạy ở chế độ KHÔNG CACHE.',
    );
  }
})();

export default redisClient;
