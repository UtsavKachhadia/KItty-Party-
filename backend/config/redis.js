import axios from 'axios';
import env from './env.js';

const client = axios.create({
  baseURL: env.UPSTASH_REDIS_REST_URL,
  headers: {
    Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
  },
  timeout: 5000,
});

function unwrap(res) {
  return res.data?.result ?? res.data;
}

const redis = {
  /**
   * SET key value [EX seconds]
   */
  async set(key, value, exSeconds) {
    try {
      const args = ['SET', key, typeof value === 'object' ? JSON.stringify(value) : String(value)];
      if (exSeconds) args.push('EX', String(exSeconds));
      const res = await client.post('/', args);
      return unwrap(res);
    } catch (err) {
      console.error(`Redis SET error: ${err.message}`);
      throw err;
    }
  },

  /**
   * GET key → returns string | null
   */
  async get(key) {
    try {
      const res = await client.post('/', ['GET', key]);
      return unwrap(res);
    } catch (err) {
      console.error(`Redis GET error: ${err.message}`);
      throw err;
    }
  },

  /**
   * DEL key
   */
  async del(key) {
    try {
      const res = await client.post('/', ['DEL', key]);
      return unwrap(res);
    } catch (err) {
      console.error(`Redis DEL error: ${err.message}`);
      throw err;
    }
  },

  /**
   * HSET key field value
   */
  async hset(key, field, value) {
    try {
      const res = await client.post('/', [
        'HSET',
        key,
        field,
        typeof value === 'object' ? JSON.stringify(value) : String(value),
      ]);
      return unwrap(res);
    } catch (err) {
      console.error(`Redis HSET error: ${err.message}`);
      throw err;
    }
  },

  /**
   * HGETALL key → returns object { field: value, ... }
   */
  async hgetall(key) {
    try {
      const res = await client.post('/', ['HGETALL', key]);
      const arr = unwrap(res);
      if (!Array.isArray(arr) || arr.length === 0) return null;
      const obj = {};
      for (let i = 0; i < arr.length; i += 2) {
        obj[arr[i]] = arr[i + 1];
      }
      return obj;
    } catch (err) {
      console.error(`Redis HGETALL error: ${err.message}`);
      throw err;
    }
  },
};

export default redis;
