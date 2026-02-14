import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ouraRequest } from './oura-client.js';

const userParam = z.enum(['david', 'brittany']).optional().describe('Whose Oura data to fetch (default: david)');

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'Oura Ring API',
    version: '1.0.0',
  });

  // ── Personal Info ──────────────────────────────────────────────
  server.tool(
    'oura_get_personal_info',
    'Get user profile information (age, weight, height, biological sex, email)',
    { user: userParam },
    async ({ user }) => {
      const data = await ouraRequest('/v2/usercollection/personal_info', {}, user);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  // ── Daily Sleep ────────────────────────────────────────────────
  server.tool(
    'oura_get_daily_sleep',
    'Get daily sleep scores and summaries. Returns one entry per day with sleep score, contributors, and timestamp.',
    {
      start_date: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      end_date: z.string().optional().describe('End date (YYYY-MM-DD)'),
      user: userParam,
    },
    async ({ start_date, end_date, user }) => {
      const data = await ouraRequest('/v2/usercollection/daily_sleep', {
        params: { start_date, end_date },
      }, user);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  // ── Sleep (detailed) ──────────────────────────────────────────
  server.tool(
    'oura_get_sleep',
    'Get detailed sleep period data including sleep stages (deep, light, rem, awake), heart rate, HRV, movement, and timing.',
    {
      start_date: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      end_date: z.string().optional().describe('End date (YYYY-MM-DD)'),
      user: userParam,
    },
    async ({ start_date, end_date, user }) => {
      const data = await ouraRequest('/v2/usercollection/sleep', {
        params: { start_date, end_date },
      }, user);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  // ── Daily Activity ────────────────────────────────────────────
  server.tool(
    'oura_get_daily_activity',
    'Get daily activity scores including steps, calories, active time, and movement contributors.',
    {
      start_date: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      end_date: z.string().optional().describe('End date (YYYY-MM-DD)'),
      user: userParam,
    },
    async ({ start_date, end_date, user }) => {
      const data = await ouraRequest('/v2/usercollection/daily_activity', {
        params: { start_date, end_date },
      }, user);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  // ── Daily Readiness ───────────────────────────────────────────
  server.tool(
    'oura_get_daily_readiness',
    'Get daily readiness scores including HRV balance, body temperature, recovery index, and resting heart rate contributors.',
    {
      start_date: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      end_date: z.string().optional().describe('End date (YYYY-MM-DD)'),
      user: userParam,
    },
    async ({ start_date, end_date, user }) => {
      const data = await ouraRequest('/v2/usercollection/daily_readiness', {
        params: { start_date, end_date },
      }, user);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  // ── Heart Rate ────────────────────────────────────────────────
  server.tool(
    'oura_get_heart_rate',
    'Get heart rate measurements (5-minute intervals). Returns BPM and source (awake, rest, sleep, workout).',
    {
      start_date: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      end_date: z.string().optional().describe('End date (YYYY-MM-DD)'),
      user: userParam,
    },
    async ({ start_date, end_date, user }) => {
      const data = await ouraRequest('/v2/usercollection/heartrate', {
        params: { start_date, end_date },
      }, user);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  // ── Daily SpO2 ────────────────────────────────────────────────
  server.tool(
    'oura_get_daily_spo2',
    'Get daily blood oxygen (SpO2) readings including average percentage.',
    {
      start_date: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      end_date: z.string().optional().describe('End date (YYYY-MM-DD)'),
      user: userParam,
    },
    async ({ start_date, end_date, user }) => {
      const data = await ouraRequest('/v2/usercollection/daily_spo2', {
        params: { start_date, end_date },
      }, user);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  // ── Daily Stress ──────────────────────────────────────────────
  server.tool(
    'oura_get_daily_stress',
    'Get daily stress levels including stress high, recovery high, and daytime stress summary.',
    {
      start_date: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      end_date: z.string().optional().describe('End date (YYYY-MM-DD)'),
      user: userParam,
    },
    async ({ start_date, end_date, user }) => {
      const data = await ouraRequest('/v2/usercollection/daily_stress', {
        params: { start_date, end_date },
      }, user);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  // ── Workouts ──────────────────────────────────────────────────
  server.tool(
    'oura_get_workouts',
    'Get workout sessions including activity type, calories, duration, distance, and intensity.',
    {
      start_date: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      end_date: z.string().optional().describe('End date (YYYY-MM-DD)'),
      user: userParam,
    },
    async ({ start_date, end_date, user }) => {
      const data = await ouraRequest('/v2/usercollection/workout', {
        params: { start_date, end_date },
      }, user);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  // ── Sessions ──────────────────────────────────────────────────
  server.tool(
    'oura_get_sessions',
    'Get restorative sessions (meditation, breathing, nap, etc.) with heart rate and HRV data.',
    {
      start_date: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      end_date: z.string().optional().describe('End date (YYYY-MM-DD)'),
      user: userParam,
    },
    async ({ start_date, end_date, user }) => {
      const data = await ouraRequest('/v2/usercollection/session', {
        params: { start_date, end_date },
      }, user);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  // ── Ring Configuration ────────────────────────────────────────
  server.tool(
    'oura_get_ring_configuration',
    'Get ring hardware info including color, design, firmware version, hardware type, and set-up date.',
    { user: userParam },
    async ({ user }) => {
      const data = await ouraRequest('/v2/usercollection/ring_configuration', {}, user);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  return server;
}
