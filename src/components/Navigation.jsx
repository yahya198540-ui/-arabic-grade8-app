export default function Navigation({ currentPage, setCurrentPage }) {
  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📚</span>
          <h1 className="text-xl font-bold">تحضير الدروس</h1>
        </div>

        <button
          onClick={() => setCurrentPage('home')}
          className="px-4 py-2 rounded hover:bg-white/20 transition font-medium"
        >
          الرئيسية
        </button>

        <a
          href="/adventure.html"
          className="px-4 py-2 rounded bg-yellow-400 text-purple-900 hover:bg-yellow-300 transition font-bold"
        >
          🚀 مغامرة العطف
        </a>
      </div>
    </nav>
  )
}
