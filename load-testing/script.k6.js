import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || 'admin@testhospital.com';
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || 'admin123';

const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');
const apiDuration = new Trend('api_duration');

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 5 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    errors: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
};

let jwtToken = '';
let hospitalId = 0;

export function setup() {
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  }), { headers: { 'Content-Type': 'application/json' } });
  check(loginRes, { 'login success': (r) => r.status === 200 });
  const body = loginRes.json();
  return { token: body.access_token, hospitalId: body.hospital_id };
}

export default function (data) {
  jwtToken = data.token;
  hospitalId = data.hospitalId;

  const params = {
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
    },
  };

  group('dashboard endpoints', function () {
    let res;

    res = http.get(`${BASE_URL}/api/hospital/admin/analytics`, params);
    check(res, { 'analytics 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
    apiDuration.add(res.timings.duration);
    sleep(1);

    res = http.get(`${BASE_URL}/api/hospital/queue`, params);
    check(res, { 'queue 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
    apiDuration.add(res.timings.duration);
    sleep(0.5);

    res = http.get(`${BASE_URL}/api/hospital/lab/queue`, params);
    check(res, { 'lab queue 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
    apiDuration.add(res.timings.duration);
    sleep(0.5);

    res = http.get(`${BASE_URL}/api/hospital/pharmacy/queue`, params);
    check(res, { 'pharmacy queue 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
    apiDuration.add(res.timings.duration);
    sleep(0.5);
  });

  group('patient list with pagination', function () {
    const res = http.get(`${BASE_URL}/api/hospital/admin/users?page=1&per_page=10`, params);
    check(res, { 'paginated users 200': (r) => r.status === 200 });
    check(res, { 'has X-Total-Count header': (r) => r.headers['X-Total-Count'] !== undefined });
    errorRate.add(res.status !== 200);
    apiDuration.add(res.timings.duration);
    sleep(1);
  });

  group('doctor endpoints', function () {
    const res = http.get(`${BASE_URL}/api/auth/doctors`, params);
    check(res, { 'doctors 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
    apiDuration.add(res.timings.duration);
    sleep(1);
  });

  group('superadmin endpoints', function () {
    if (hospitalId) {
      const res = http.get(`${BASE_URL}/api/superadmin/stats?hospital_id=${hospitalId}`, params);
      check(res, { 'superadmin stats 200': (r) => r.status === 200 });
      errorRate.add(res.status !== 200);
      apiDuration.add(res.timings.duration);
    }
    sleep(1);
  });
}

export function teardown(data) {
  // no cleanup needed
}
