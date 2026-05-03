const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3001/api';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

let testCount = 0;
let passCount = 0;

async function test(name, fn) {
  testCount++;
  try {
    await fn();
    console.log(`${colors.green}✅ Test ${testCount}: ${name}${colors.reset}`);
    passCount++;
  } catch (e) {
    console.log(`${colors.red}❌ Test ${testCount}: ${name}${colors.reset}`);
    console.log(`   Error: ${e.message}`);
  }
}

async function runTests() {
  console.log(`${colors.blue}=== API ENDPOINT TEST SUITE ===${colors.reset}\n`);

  // Auth Tests
  console.log(`${colors.yellow}--- Auth Endpoints ---${colors.reset}`);

  let token = '';
  let adminToken = '';
  let username = `testuser_${Date.now()}`;
  let email = `test_${Date.now()}@example.com`;
  const adminAuth = () => ({
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  await test('POST /auth/register - valid user', async () => {
    const res = await axios.post(`${API_URL}/auth/register`, {
      username,
      email,
      password: 'password123'
    });
    if (res.data.msg !== 'OK' || res.data.user.username !== username) {
      throw new Error('Invalid response');
    }
  });

  await test('POST /auth/register - password too short', async () => {
    try {
      await axios.post(`${API_URL}/auth/register`, {
        username: `user_${Date.now()}`,
        email: `test_${Date.now()}@test.com`,
        password: '123'
      });
      throw new Error('Should have failed');
    } catch (e) {
      if (!e.response || e.response.status !== 400) throw e;
    }
  });

  await test('POST /auth/register - missing fields', async () => {
    try {
      await axios.post(`${API_URL}/auth/register`, {
        username: `user_${Date.now()}`
      });
      throw new Error('Should have failed');
    } catch (e) {
      if (!e.response || e.response.status !== 400) throw e;
    }
  });

  await test('POST /auth/login - valid credentials', async () => {
    const res = await axios.post(`${API_URL}/auth/login`, {
      username,
      password: 'password123'
    });
    if (!res.data.token || res.data.user.username !== username) {
      throw new Error('Invalid response');
    }
    token = res.data.token;
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  });

  await test('POST /auth/login - invalid password', async () => {
    try {
      await axios.post(`${API_URL}/auth/login`, {
        username,
        password: 'wrongpassword'
      });
      throw new Error('Should have failed');
    } catch (e) {
      if (!e.response || e.response.status !== 400) throw e;
    }
  });

  await test('GET /auth/top-users', async () => {
    const res = await axios.get(`${API_URL}/auth/top-users`);
    if (!Array.isArray(res.data)) throw new Error('Should return array');
  });

  await test('GET /auth/statistics', async () => {
    const res = await axios.get(`${API_URL}/auth/statistics`);
    const requiredFields = ['members', 'messages', 'posts', 'jobs'];
    if (!requiredFields.every((field) => Object.prototype.hasOwnProperty.call(res.data, field))) {
      throw new Error('Missing stats fields');
    }
  });

  await test('GET /auth/activities', async () => {
    const res = await axios.get(`${API_URL}/auth/activities`);
    if (!Array.isArray(res.data)) throw new Error('Should return array');
  });

  await test('GET /auth/events', async () => {
    const res = await axios.get(`${API_URL}/auth/events`);
    if (!Array.isArray(res.data)) throw new Error('Should return array');
  });

  await test('GET /auth/announcements', async () => {
    const res = await axios.get(`${API_URL}/auth/announcements`);
    if (!Array.isArray(res.data)) throw new Error('Should return array');
  });

  // Posts Tests
  console.log(`\n${colors.yellow}--- Posts Endpoints ---${colors.reset}`);

  let postId = '';

  await test('POST /posts - create post', async () => {
    const res = await axios.post(`${API_URL}/posts`, {
      author: username,
      title: 'Test Post',
      content: 'This is a test post'
    });
    if (!res.data._id || res.data.author !== username) {
      throw new Error('Invalid response');
    }
    postId = res.data._id;
  });

  await test('POST /posts - missing fields', async () => {
    try {
      await axios.post(`${API_URL}/posts`, {
        author: username
      });
      throw new Error('Should have failed');
    } catch (e) {
      if (!e.response || e.response.status !== 400) throw e;
    }
  });

  await test('GET /posts - list all posts', async () => {
    const res = await axios.get(`${API_URL}/posts`);
    if (!Array.isArray(res.data)) throw new Error('Should return array');
  });

  await test('GET /posts/:id - get single post', async () => {
    const res = await axios.get(`${API_URL}/posts/${postId}`);
    if (res.data._id !== postId) throw new Error('Wrong post returned');
  });

  await test('PUT /posts/:id/like - like post', async () => {
    const res = await axios.put(`${API_URL}/posts/${postId}/like`, {
      username: username
    });
    if (!res.data.likes || res.data.likes.indexOf(username) === -1) {
      throw new Error('Like not added');
    }
  });

  await test('PUT /posts/:id/like - unlike post', async () => {
    const res = await axios.put(`${API_URL}/posts/${postId}/like`, {
      username: username
    });
    if (res.data.likes && res.data.likes.indexOf(username) !== -1) {
      throw new Error('Like should be removed');
    }
  });

  await test('POST /posts/:id/comment - add comment', async () => {
    const res = await axios.post(`${API_URL}/posts/${postId}/comment`, {
      user: username,
      text: 'Test comment'
    });
    if (res.data.user !== username || res.data.text !== 'Test comment') {
      throw new Error('Invalid response');
    }
  });

  await test('DELETE /posts/:id - delete post', async () => {
    await axios.delete(`${API_URL}/posts/${postId}`);
    try {
      await axios.get(`${API_URL}/posts/${postId}`);
      throw new Error('Post should be deleted');
    } catch (e) {
      if (!e.response || e.response.status !== 404) throw e;
    }
  });

  // Jobs Tests
  console.log(`\n${colors.yellow}--- Jobs Endpoints ---${colors.reset}`);

  let jobId = '';

  await test('POST /jobs - create job', async () => {
    const res = await axios.post(`${API_URL}/jobs`, {
      title: 'Software Engineer',
      company: 'Tech Corp',
      postedBy: username,
      salary: '20-30M',
      type: 'Toàn thời gian',
      level: 'Mid',
      location: 'HCM',
      skills: ['Node.js', 'React'],
      description: 'Looking for a software engineer'
    });
    if (!res.data._id || res.data.title !== 'Software Engineer') {
      throw new Error('Invalid response');
    }
    jobId = res.data._id;
  });

  await test('POST /jobs - missing required fields', async () => {
    try {
      await axios.post(`${API_URL}/jobs`, {
        company: 'Tech Corp'
      });
      throw new Error('Should have failed');
    } catch (e) {
      if (!e.response || e.response.status !== 400) throw e;
    }
  });

  await test('GET /jobs - list all jobs', async () => {
    const res = await axios.get(`${API_URL}/jobs`);
    if (!Array.isArray(res.data)) throw new Error('Should return array');
  });

  await test('GET /jobs/:id - get single job', async () => {
    const res = await axios.get(`${API_URL}/jobs/${jobId}`);
    if (res.data._id !== jobId) throw new Error('Wrong job returned');
  });

  await test('POST /jobs/:id/apply - apply for job', async () => {
    const res = await axios.post(`${API_URL}/jobs/${jobId}/apply`, {
      username: username
    });
    if (!res.data.msg) throw new Error('Invalid response');
  });

  // Bookmarks Tests
  console.log(`\n${colors.yellow}--- Bookmarks Endpoints ---${colors.reset}`);

  // Create a post to bookmark
  let bookmarkPostId = '';
  await test('Setup: Create post for bookmark', async () => {
    const res = await axios.post(`${API_URL}/posts`, {
      author: username,
      title: 'Bookmark Test Post',
      content: 'Test'
    });
    bookmarkPostId = res.data._id;
  });

  await test('POST /bookmarks - add bookmark', async () => {
    const res = await axios.post(`${API_URL}/bookmarks`, {
      userId: username,
      postId: bookmarkPostId,
      type: 'post'
    });
    if (!res.data._id) throw new Error('Invalid response');
  });

  await test('GET /bookmarks/user/:username - list user bookmarks', async () => {
    const res = await axios.get(`${API_URL}/bookmarks/user/${username}`);
    if (!Array.isArray(res.data)) throw new Error('Should return array');
  });

  await test('DELETE /bookmarks - remove bookmark', async () => {
    const res = await axios.delete(`${API_URL}/bookmarks`, {
      data: {
        userId: username,
        postId: bookmarkPostId
      }
    });
    if (res.data.deletedCount !== 1) throw new Error('Bookmark not deleted');
  });

  // Users Tests
  console.log(`\n${colors.yellow}--- Users Endpoints ---${colors.reset}`);

  await test('GET /users/:username - get user profile', async () => {
    const res = await axios.get(`${API_URL}/users/${username}`);
    if (res.data.username !== username) throw new Error('Invalid response');
  });

  await test('PUT /users/:username - update profile', async () => {
    const res = await axios.put(`${API_URL}/users/${username}`, {
      bio: 'Updated bio',
      school: 'Test School',
      major: 'Computer Science'
    });
    if (res.data.bio !== 'Updated bio') throw new Error('Bio not updated');
  });

  await test('GET /users/:username/posts - get user posts', async () => {
    const res = await axios.get(`${API_URL}/users/${username}/posts`);
    if (!Array.isArray(res.data)) throw new Error('Should return array');
  });

  // Chat Tests
  console.log(`\n${colors.yellow}--- Chat Endpoints ---${colors.reset}`);

  await test('POST /chat/:room - post message', async () => {
    const res = await axios.post(`${API_URL}/chat/general`, {
      username: username,
      message: 'Hello chat!'
    });
    if (res.data.username !== username || res.data.message !== 'Hello chat!') {
      throw new Error('Invalid response');
    }
  });

  await test('GET /chat/:room - get messages', async () => {
    const res = await axios.get(`${API_URL}/chat/general`);
    if (!Array.isArray(res.data)) throw new Error('Should return array');
  });

  await test('GET /chat/rooms/list/all - get all rooms', async () => {
    const res = await axios.get(`${API_URL}/chat/rooms/list/all`);
    if (!Array.isArray(res.data)) throw new Error('Should return array');
  });

  // Admin Tests
  console.log(`\n${colors.yellow}--- Admin Endpoints ---${colors.reset}`);

  await test('POST /admin/login - valid admin credentials', async () => {
    const res = await axios.post(`${API_URL}/admin/login`, {
      username: process.env.DEFAULT_ADMIN_USERNAME || 'admin',
      password: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123'
    });
    if (!res.data.token || !res.data.admin) {
      throw new Error('Invalid admin login response');
    }
    adminToken = res.data.token;
  });

  await test('GET /admin/stats - get dashboard stats', async () => {
    const res = await axios.get(`${API_URL}/admin/stats`, adminAuth());
    const requiredFields = ['totalUsers', 'totalPosts', 'totalJobs', 'totalActivities'];
    if (!requiredFields.every((field) => Object.prototype.hasOwnProperty.call(res.data, field))) {
      throw new Error('Missing stats');
    }
  });

  await test('GET /admin/users - list all users', async () => {
    const res = await axios.get(`${API_URL}/admin/users`, adminAuth());
    if (!Array.isArray(res.data)) throw new Error('Should return array');
  });

  await test('GET /admin/posts - list all posts', async () => {
    const res = await axios.get(`${API_URL}/admin/posts`, adminAuth());
    if (!Array.isArray(res.data)) throw new Error('Should return array');
  });

  await test('GET /admin/jobs - list all jobs', async () => {
    const res = await axios.get(`${API_URL}/admin/jobs`, adminAuth());
    if (!Array.isArray(res.data)) throw new Error('Should return array');
  });

  await test('POST /admin/create-admin - create admin account', async () => {
    const res = await axios.post(`${API_URL}/admin/create-admin`, {
      username: `admin_${Date.now()}`,
      email: `admin_${Date.now()}@test.com`,
      password: 'admin123'
    }, adminAuth());
    if (!res.data.admin) throw new Error('Admin not created');
  });

  await test('DELETE /admin/users/:username - delete user', async () => {
    const newUser = `user_to_delete_${Date.now()}`;
    await axios.post(`${API_URL}/auth/register`, {
      username: newUser,
      email: `delete_${Date.now()}@test.com`,
      password: 'password123'
    });
    const res = await axios.delete(`${API_URL}/admin/users/${newUser}`, adminAuth());
    if (res.data.message !== 'User deleted successfully') throw new Error('User not deleted');
  });

  // Create a job to delete
  let jobToDeleteId = '';
  await test('Setup: Create job for delete test', async () => {
    const res = await axios.post(`${API_URL}/jobs`, {
      title: 'Job to Delete',
      company: 'Delete Corp',
      postedBy: username
    });
    jobToDeleteId = res.data._id;
  });

  await test('DELETE /admin/jobs/:id - delete job', async () => {
    const res = await axios.delete(`${API_URL}/admin/jobs/${jobToDeleteId}`, adminAuth());
    if (res.data.message !== 'Job deleted successfully') throw new Error('Job not deleted');
  });

  // Summary
  console.log(`\n${colors.blue}=== TEST SUMMARY ===${colors.reset}`);
  console.log(`${colors.green}Passed: ${passCount}/${testCount}${colors.reset}`);
  if (passCount === testCount) {
    console.log(`${colors.green}✅ All tests passed!${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ ${testCount - passCount} tests failed${colors.reset}`);
  }
}

runTests().catch(e => {
  console.error('Test suite error:', e);
  process.exit(1);
});
