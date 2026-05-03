import React from "react";
import { Link } from "react-router-dom";

function Landing() {
  const features = [
    {
      icon: "💬",
      title: "Chat Real-time",
      desc: "Trò chuyện, giao lưu qua kênh chat, kết nối bạn bè cùng trường",
      gradient: "from-blue-100 to-blue-50"
    },
    {
      icon: "📚",
      title: "Chia sẻ Kiến thức",
      desc: "Đăng bài, đọc kinh nghiệm, cùng nhau học tập và phát triển thêm kỹ năng",
      gradient: "from-purple-100 to-purple-50"
    },
    {
      icon: "💼",
      title: "Việc làm Sinh viên",
      desc: "Cập nhật cơ hội việc làm, thực tập, nâng bước sự nghiệp",
      gradient: "from-green-100 to-green-50"
    }
  ];

  const testimonials = [
    {
      name: "Nguyễn Anh",
      school: "Đại học Bách Khoa",
      text: "Cộng đồng sinh viên NTTU giúp tôi kết nối với rất nhiều bạn học và tìm được cơ hội thực tập tuyệt vời!",
      avatar: "N"
    },
    {
      name: "Trần Linh",
      school: "Đại học Kinh tế",
      text: "Cộng đồng rất tích cực, mọi người sẵn sàng chia sẻ kiến thức và giúp đỡ nhau.",
      avatar: "T"
    },
    {
      name: "Lê Minh",
      school: "Đại học Công nghệ",
      text: "Chat room rất hữu ích để thảo luận bài tập và học hỏi kinh nghiệm từ các bạn khác.",
      avatar: "L"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="header bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-2xl font-extrabold text-blue-600">
            📱 Cộng đồng sinh viên NTTU
          </div>
          <Link to="/register">
            <button className="bg-blue-600 text-white rounded-lg px-6 py-2 shadow hover:bg-blue-700 transition font-semibold hover:shadow-lg">
              🔓 Đăng ký / Đăng nhập
            </button>
          </Link>
        </div>
      </header>

      {/* Hero section */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-gray-900">
            🎓 Cộng đồng Sinh viên
            <span className="block text-blue-600 mt-2">Kết nối & Phát triển</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-700 max-w-xl mx-auto mb-8">
            Một nền tảng toàn diện dành cho sinh viên để học hỏi, chia sẻ kiến thức, trò chuyện và tìm kiếm cơ hội việc làm trong một môi trường năng động và tin cậy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <button className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-8 text-lg rounded-full shadow-lg hover:shadow-xl transition transform hover:scale-105">
                🚀 Bắt đầu ngay
              </button>
            </Link>
            <button className="bg-white border-2 border-blue-600 text-blue-600 font-semibold py-3 px-8 text-lg rounded-full hover:bg-blue-50 transition">
              📖 Tìm hiểu thêm
            </button>
          </div>
        </div>
      </section>

      {/* Stats section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600">5K+</div>
              <p className="text-gray-600 mt-2">Sinh viên tham gia</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600">50K+</div>
              <p className="text-gray-600 mt-2">Tin nhắn được gửi</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600">2K+</div>
              <p className="text-gray-600 mt-2">Bài viết chia sẻ</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-600">100+</div>
              <p className="text-gray-600 mt-2">Cơ hội việc làm</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">✨ Tính năng nổi bật</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className={`bg-gradient-to-br ${feature.gradient} p-8 rounded-xl shadow-lg hover:shadow-xl transition transform hover:scale-105`}
              >
                <div className="text-6xl mb-4">{feature.icon}</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-700">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">💬 Feedback từ cộng đồng</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, idx) => (
              <div key={idx} className="bg-gray-50 p-6 rounded-xl shadow hover:shadow-lg transition">
                <div className="flex items-center gap-3 mb-4">
                  <div className="avatar w-12 h-12 text-lg">{testimonial.avatar}</div>
                  <div>
                    <p className="font-bold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-600">{testimonial.school}</p>
                  </div>
                </div>
                <p className="text-gray-700 italic">"{testimonial.text}"</p>
                <div className="mt-4 text-lg">⭐⭐⭐⭐⭐</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="mb-2">© 2026 Cộng đồng sinh viên NTTU</p>
          <p className="text-sm">Nền tảng học tập, chia sẻ và kết nối cho sinh viên Việt Nam</p>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
