import { useState, useEffect } from 'react'
import { saveLesson } from '../db'
import { DEFAULT_LESSON, LESSON_FIELDS, UNITS_GRADE_8, RHETORICAL_TERMS_LIMIT } from '../constants'
import { validateLesson } from '../utils'

export default function LessonForm({ lessonId = null, initialLesson = null, onSaved, onCancel }) {
  const [lesson, setLesson] = useState(initialLesson || DEFAULT_LESSON)
  const [errors, setErrors] = useState([])
  const [saving, setSaving] = useState(false)
  const [rhetorical_terms, setRhetoricalTerms] = useState(initialLesson?.rhetorical_terms || [])
  const [termInput, setTermInput] = useState('')

  useEffect(() => {
    if (lessonId && !initialLesson) {
      // Load lesson if ID provided
    }
  }, [lessonId, initialLesson])

  const handleFieldChange = (field, value) => {
    setLesson(prev => ({ ...prev, [field]: value }))
    setErrors(errors.filter(err => !err.includes(field)))
  }

  const handleAddTerm = () => {
    if (termInput.trim() && rhetorical_terms.length < RHETORICAL_TERMS_LIMIT) {
      setRhetoricalTerms([...rhetorical_terms, termInput.trim()])
      setTermInput('')
    }
  }

  const handleRemoveTerm = (index) => {
    setRhetoricalTerms(rhetorical_terms.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    const validationErrors = validateLesson(lesson)
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    setSaving(true)
    try {
      await saveLesson({
        ...lesson,
        rhetorical_terms,
      })
      if (onSaved) onSaved()
    } catch (error) {
      setErrors(['حدث خطأ أثناء حفظ التحضير'])
      console.error('Error saving lesson:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-3xl font-bold text-primary mb-6">
        {lessonId ? 'تعديل التحضير' : 'تحضير درس جديد'}
      </h2>

      {errors.length > 0 && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-800 dark:text-red-200 rounded">
          <p className="font-bold mb-2">الأخطاء:</p>
          <ul className="list-disc list-inside">
            {errors.map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-6">
        {/* Unit Selection */}
        <div>
          <label className="block font-bold text-primary mb-2">الوحدة</label>
          <select
            value={lesson.unit}
            onChange={(e) => handleFieldChange('unit', e.target.value)}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded"
          >
            <option value="">اختر الوحدة</option>
            {UNITS_GRADE_8.map(unit => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
        </div>

        {/* Main Fields */}
        {LESSON_FIELDS.map(field => (
          <div key={field.id}>
            <label className="block font-bold text-primary mb-2">{field.label}</label>
            {field.type === 'textarea' ? (
              <textarea
                value={lesson[field.id]}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                placeholder={field.placeholder}
                rows={4}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded dark:text-white"
              />
            ) : (
              <input
                type="text"
                value={lesson[field.id]}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                placeholder={field.placeholder}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded dark:text-white"
              />
            )}
          </div>
        ))}

        {/* Rhetorical Terms */}
        <div>
          <label className="block font-bold text-primary mb-2">
            المصطلحات البلاغية (الحد الأقصى: {RHETORICAL_TERMS_LIMIT})
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={termInput}
              onChange={(e) => setTermInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTerm()}
              placeholder="أدخل مصطلح بلاغي"
              disabled={rhetorical_terms.length >= RHETORICAL_TERMS_LIMIT}
              className="flex-1 p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded disabled:opacity-50 dark:text-white"
            />
            <button
              type="button"
              onClick={handleAddTerm}
              disabled={rhetorical_terms.length >= RHETORICAL_TERMS_LIMIT}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition"
            >
              إضافة
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {rhetorical_terms.map((term, idx) => (
              <span
                key={idx}
                className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full flex items-center gap-2"
              >
                {term}
                <button
                  type="button"
                  onClick={() => handleRemoveTerm(idx)}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-200"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Additional Notes */}
        <div>
          <label className="block font-bold text-primary mb-2">ملاحظات إضافية</label>
          <textarea
            value={lesson.notes || ''}
            onChange={(e) => handleFieldChange('notes', e.target.value)}
            placeholder="أي ملاحظات أخرى..."
            rows={3}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded dark:text-white"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 px-6 py-3 bg-green-600 text-white rounded font-bold hover:bg-green-700 disabled:opacity-50 transition"
        >
          {saving ? 'جاري الحفظ...' : 'حفظ التحضير'}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 bg-gray-400 text-white rounded font-bold hover:bg-gray-500 transition"
          >
            إلغاء
          </button>
        )}
      </div>
    </div>
  )
}
