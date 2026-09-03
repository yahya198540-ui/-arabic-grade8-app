import { useState } from 'react'
import { deleteLesson, getLesson } from '../db'
import { formatDateArabic } from '../utils'
import LessonDetails from './LessonDetails'
import LessonForm from './LessonForm'

export default function LessonArchive({ lessons, onLessonDeleted, onReload }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterUnit, setFilterUnit] = useState('')
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [editingLesson, setEditingLesson] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const filteredLessons = lessons.filter(lesson => {
    const matchesSearch =
      lesson.title_unit.includes(searchQuery) ||
      lesson.grade_section_date.includes(searchQuery)
    const matchesUnit = !filterUnit || lesson.unit === filterUnit
    return matchesSearch && matchesUnit
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const handleDelete = async (id) => {
    if (!window.confirm('هل تريد حذف هذا التحضير؟')) return

    setDeleting(true)
    try {
      await deleteLesson(id)
      onLessonDeleted()
      setSelectedLesson(null)
    } finally {
      setDeleting(false)
    }
  }

  const handleEdit = async (id) => {
    const lesson = await getLesson(id)
    setEditingLesson(lesson)
    setSelectedLesson(null)
  }

  const handleEditSaved = () => {
    onReload()
    setEditingLesson(null)
  }

  if (editingLesson) {
    return (
      <LessonForm
        lessonId={editingLesson.id}
        initialLesson={editingLesson}
        onSaved={handleEditSaved}
        onCancel={() => setEditingLesson(null)}
      />
    )
  }

  if (selectedLesson) {
    return (
      <LessonDetails
        lesson={selectedLesson}
        onEdit={() => handleEdit(selectedLesson.id)}
        onDelete={() => handleDelete(selectedLesson.id)}
        onBack={() => setSelectedLesson(null)}
        deleting={deleting}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold text-primary mb-6">📚 أرشيف التحضيرات</h2>

        {/* Search and Filter */}
        <div className="space-y-4 mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن درس..."
            className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded dark:text-white"
          />

          <select
            value={filterUnit}
            onChange={(e) => setFilterUnit(e.target.value)}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded dark:text-white"
          >
            <option value="">جميع الوحدات</option>
            {Array.from(new Set(lessons.map(l => l.unit))).map(unit => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
        </div>

        {/* Lessons List */}
        {filteredLessons.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-lg">لا توجد تحضيرات محفوظة</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">ابدأ بإنشاء تحضير جديد</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLessons.map(lesson => (
              <div
                key={lesson.id}
                onClick={() => setSelectedLesson(lesson)}
                className="p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded cursor-pointer hover:shadow-md hover:bg-gray-100 dark:hover:bg-gray-600 transition"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-primary">{lesson.title_unit}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{lesson.grade_section_date}</p>
                    {lesson.unit && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{lesson.unit}</p>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDateArabic(lesson.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        إجمالي التحضيرات: {lessons.length}
      </div>
    </div>
  )
}
