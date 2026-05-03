import React, { useEffect, useState } from 'react';
import axios from 'axios';

function Dashboard({ user }) {
  const [topUsers, setTopUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get('/api/auth/top-users')
      .then(res => setTopUsers(res.data))
      .catch(() => setTopUsers([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Welcome section */}
          <div className="flex items-center space-x-4">
            <div className="avatar w-14 h-14 text-lg">
              {(user?.username || 'U')?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                👋 Xin chào, <span className="text-blue-600">{user?.username || 'User'}</span>!
              </h2>
              <p className="text-gray-600 text-sm">Chúc bạn một ngày học tập vui vẻ</p>
            </div>
          </div>

          {/* Top users section */}
          <div className="bg-white rounded-lg p-4 shadow-md">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center">
              🏆 Top Người dùng uy tín
            </h3>
            {loading ? (
              <div className="text-gray-500 text-sm">⏳ Đang tải...</div>
            ) : topUsers.length > 0 ? (
              <ul className="space-y-2">
                {topUsers.slice(0, 3).map((u, idx) => (
                  <li key={u.username} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'} {u.username}
                    </span>
                    <span className="badge badge-primary">{u.reputation} pts</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">Chưa có dữ liệu</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
