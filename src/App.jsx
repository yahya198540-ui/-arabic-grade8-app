import { useState, useEffect } from 'react'
import Navigation from './components/Navigation'
import LessonForm from './components/LessonForm'
import LessonArchive from './components/LessonArchive'
import FileUploadSection from './components/FileUploadSection'
import { getLessons } from './db'

export default function App() {
  const [currentPage, setCurrentPage] = useState('home')
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLessons()
  }, [])

  const loadLessons = async () => {
    try {
      const data = await getLessons()
      setLessons(data)
    } catch (error) {
      console.error('Error loading lessons:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLessonSaved = () => {
    loadLessons()
    setCurrentPage('archive')
  }

  const handleLessonDeleted = () => {
    loadLessons()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <Navigation currentPage={currentPage} setCurrentPage={setCurrentPage} />

      <main className="max-w-4xl mx-auto px-4 py-6 pb-20">
        {currentPage === 'home' && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-primary mb-2">تحضير الدروس</h1>
              <p className="text-gray-600 dark:text-gray-400">اللغة العربية - الصف الثامن</p>
            </div>

            <FileUploadSection />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={() => setCurrentPage('new')}
                className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg cursor-pointer transition text-center"
              >
                <div className="text-4xl mb-3">📝</div>
                <h3 className="text-lg font-bold text-primary">تحضير جديد</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">ابدأ بتحضير درس جديد</p>
              </div>

              <div
                onClick={() => setCurrentPage('archive')}
                className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg cursor-pointer transition text-center"
              >
                <div className="text-4xl mb-3">📚</div>
                <h3 className="text-lg font-bold text-primary">الأرشيف</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">عرض التحضيرات السابقة ({lessons.length})</p>
              </div>

              <div
                onClick={() => setCurrentPage('settings')}
                className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg cursor-pointer transition text-center"
              >
                <div className="text-4xl mb-3">⚙️</div>
                <h3 className="text-lg font-bold text-primary">الإعدادات</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">إدارة الملفات والإعدادات</p>
              </div>
            </div>
          </div>
        )}

        {currentPage === 'new' && (
          <div>
            <button
              onClick={() => setCurrentPage('home')}
              className="mb-6 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              ← العودة
            </button>
            <LessonForm onSaved={handleLessonSaved} />
          </div>
        )}

        {currentPage === 'archive' && (
          <div>
            <button
              onClick={() => setCurrentPage('home')}
              className="mb-6 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              ← العودة
            </button>
            <LessonArchive lessons={lessons} onLessonDeleted={handleLessonDeleted} onReload={loadLessons} />
          </div>
        )}

        {currentPage === 'settings' && (
          <div>
            <button
              onClick={() => setCurrentPage('home')}
              className="mb-6 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              ← العودة
            </button>
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow">
              <h2 className="text-2xl font-bold text-primary mb-4">الإعدادات</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">تم حفظ جميع البيانات محلياً على جهازك</p>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded border border-blue-200 dark:border-blue-700">
                  <h3 className="font-bold text-blue-900 dark:text-blue-100">💾 التخزين</h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mt-2">التطبيق يستخدم قاعدة بيانات محلية لحفظ جميع التحضيرات والملفات</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900 rounded border border-green-200 dark:border-green-700">
                  <h3 className="font-bold text-green-900 dark:text-green-100">📱 PWA</h3>
                  <p className="text-sm text-green-800 dark:text-green-200 mt-2">يمكنك تثبيت هذا التطبيق على شاشتك الرئيسية كتطبيق جوال</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
