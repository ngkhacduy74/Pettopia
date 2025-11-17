import { createClient } from 'redis';

const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const redisUrl = `redis://${REDIS_HOST}:${REDIS_PORT}`;

console.log(`Đang khởi tạo Redis client tại: ${redisUrl}`);

const redisClient = createClient({
  url: redisUrl,
});

redisClient.on('connect', () => {
  console.log(`✅ Đang kết nối đến Redis...`);
});

redisClient.on('ready', () => {
  console.log('Redis client đã sẵn sàng (ready).');
});

redisClient.on('error', (err) => {
  console.error('❌ Lỗi Redis client:', err);
});

redisClient.on('end', () => {
  console.log('Đã ngắt kết nối khỏi Redis.');
});

(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error('Không thể thực hiện .connect() đến Redis:', err);
  }
})();

export default redisClient;
