import { useState } from 'react'

export default function FileUploadSection() {
  const [uploadStatus, setUploadStatus] = useState(null)

  const handleFileUpload = (e, type) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setUploadStatus({ type: 'error', message: 'الرجاء تحميل ملف PDF فقط' })
      return
    }

    // Store in localStorage for now
    const reader = new FileReader()
    reader.onload = (event) => {
      const fileData = {
        name: file.name,
        type: type,
        data: event.target.result,
        uploadedAt: new Date().toISOString(),
      }
      localStorage.setItem(
        `pdf_${type}`,
        JSON.stringify(fileData)
      )
      setUploadStatus({
        type: 'success',
        message: `تم تحميل ${type === 'teacher-guide' ? 'دليل المعلم' : 'كتاب الطالب'} بنجاح`,
      })
      setTimeout(() => setUploadStatus(null), 3000)
    }
    reader.readAsDataURL(file)
  }

  const getUploadedFiles = () => {
    const files = {}
    const teacherGuide = localStorage.getItem('pdf_teacher-guide')
    const studentBook = localStorage.getItem('pdf_student-book')

    if (teacherGuide) {
      const data = JSON.parse(teacherGuide)
      files.teacherGuide = data.name
    }
    if (studentBook) {
      const data = JSON.parse(studentBook)
      files.studentBook = data.name
    }
    return files
  }

  const uploadedFiles = getUploadedFiles()

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold text-primary mb-4">📄 الملفات المرجعية</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Teacher Guide Upload */}
        <div className="border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-lg p-6 text-center">
          <div className="text-4xl mb-3">📖</div>
          <h3 className="font-bold text-lg mb-2">دليل المعلم</h3>
          {uploadedFiles.teacherGuide && (
            <p className="text-sm text-green-600 dark:text-green-400 mb-3">
              ✓ {uploadedFiles.teacherGuide}
            </p>
          )}
          <label className="inline-block cursor-pointer">
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => handleFileUpload(e, 'teacher-guide')}
              className="hidden"
            />
            <span className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
              {uploadedFiles.teacherGuide ? 'استبدال الملف' : 'رفع الملف'}
            </span>
          </label>
        </div>

        {/* Student Book Upload */}
        <div className="border-2 border-dashed border-purple-300 dark:border-purple-600 rounded-lg p-6 text-center">
          <div className="text-4xl mb-3">📕</div>
          <h3 className="font-bold text-lg mb-2">كتاب الطالب</h3>
          {uploadedFiles.studentBook && (
            <p className="text-sm text-green-600 dark:text-green-400 mb-3">
              ✓ {uploadedFiles.studentBook}
            </p>
          )}
          <label className="inline-block cursor-pointer">
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => handleFileUpload(e, 'student-book')}
              className="hidden"
            />
            <span className="inline-block px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition">
              {uploadedFiles.studentBook ? 'استبدال الملف' : 'رفع الملف'}
            </span>
          </label>
        </div>
      </div>

      {uploadStatus && (
        <div className={`mt-4 p-4 rounded ${
          uploadStatus.type === 'success'
            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
            : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
        }`}>
          {uploadStatus.message}
        </div>
      )}

      <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
        💡 الملفات المرفوعة تُستخدم كمصدر أساسي عند اقتراح مسودات التحضير. يمكنك تحديثها في أي وقت.
      </p>
    </div>
  )
}
