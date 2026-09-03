import { generatePDF } from '../utils'
import { LESSON_FIELDS } from '../constants'

export default function LessonDetails({ lesson, onEdit, onDelete, onBack, deleting }) {
  const handleExportPDF = () => {
    const htmlContent = generatePDF(lesson)
    const printWindow = window.open('', '', 'width=800,height=600')
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 250)
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-400 dark:bg-gray-600 text-white rounded hover:bg-gray-500 dark:hover:bg-gray-700 transition"
        >
          ← العودة
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-primary mb-2">{lesson.title_unit}</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{lesson.grade_section_date}</p>

        {/* Fields Display */}
        <div className="space-y-8 mb-8">
          {LESSON_FIELDS.map(field => (
            <div key={field.id}>
              <h3 className="text-lg font-bold text-primary mb-3">{field.label}</h3>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded border-r-4 border-primary">
                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                  {lesson[field.id] || '-'}
                </p>
              </div>
            </div>
          ))}

          {/* Rhetorical Terms */}
          {lesson.rhetorical_terms && lesson.rhetorical_terms.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-primary mb-3">المصطلحات البلاغية</h3>
              <div className="flex flex-wrap gap-2">
                {lesson.rhetorical_terms.map((term, idx) => (
                  <span
                    key={idx}
                    className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-4 py-2 rounded-full"
                  >
                    {term}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Additional Notes */}
          {lesson.notes && (
            <div>
              <h3 className="text-lg font-bold text-primary mb-3">ملاحظات إضافية</h3>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900 rounded border border-yellow-200 dark:border-yellow-700">
                <p className="text-yellow-800 dark:text-yellow-200 whitespace-pre-wrap">
                  {lesson.notes}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 justify-between">
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={onEdit}
              className="px-6 py-3 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition"
            >
              ✏️ تعديل
            </button>
            <button
              onClick={handleExportPDF}
              className="px-6 py-3 bg-green-600 text-white rounded font-bold hover:bg-green-700 transition"
            >
              📥 تصدير PDF
            </button>
          </div>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="px-6 py-3 bg-red-600 text-white rounded font-bold hover:bg-red-700 disabled:opacity-50 transition"
          >
            {deleting ? '⏳ جاري الحذف...' : '🗑️ حذف'}
          </button>
        </div>
      </div>
    </div>
  )
}
