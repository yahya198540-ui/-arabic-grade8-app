export const formatDate = (date) => {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const formatDateArabic = (date) => {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${day}/${month}/${year}`
}

export const extractPdfText = async (pdfData) => {
  const pdfjsLib = window.pdfjsWorker || await import('pdfjs-dist')
  // This will be implemented when PDF extraction is added
  return ''
}

export const generatePDF = (lesson) => {
  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>تحضير درس</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          direction: rtl;
          text-align: right;
          padding: 20px;
          line-height: 1.6;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #333;
          padding-bottom: 10px;
        }
        .field {
          margin-bottom: 20px;
          page-break-inside: avoid;
        }
        .field-label {
          font-weight: bold;
          font-size: 14px;
          color: #1e40af;
          margin-bottom: 8px;
          border-right: 4px solid #1e40af;
          padding-right: 10px;
        }
        .field-value {
          font-size: 12px;
          white-space: pre-wrap;
          padding: 10px;
          background-color: #f5f5f5;
          border-radius: 4px;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 10px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>تحضير درس</h1>
        <p>اللغة العربية - الصف الثامن</p>
      </div>

      ${renderFieldHtml('عنوان الدرس والوحدة', lesson.title_unit)}
      ${renderFieldHtml('الصف والشعبة والتاريخ', lesson.grade_section_date)}
      ${renderFieldHtml('الأهداف التعليمية', lesson.objectives)}
      ${renderFieldHtml('الوسائل والأدوات', lesson.resources)}
      ${renderFieldHtml('التمهيد', lesson.introduction)}
      ${renderFieldHtml('إجراءات الدرس', lesson.procedures)}
      ${renderFieldHtml('الأنشطة الصفية', lesson.activities)}
      ${renderFieldHtml('التقويم', lesson.assessment)}
      ${renderFieldHtml('الواجب المنزلي', lesson.homework)}

      <div class="footer">
        <p>تم التحضير بواسطة تطبيق تحضير دروس اللغة العربية</p>
        <p>${new Date().toLocaleDateString('ar-SA')}</p>
      </div>
    </body>
    </html>
  `
  return html
}

const renderFieldHtml = (label, value) => {
  if (!value) return ''
  return `
    <div class="field">
      <div class="field-label">${label}</div>
      <div class="field-value">${value.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
    </div>
  `
}

export const validateLesson = (lesson) => {
  const errors = []
  if (!lesson.title_unit?.trim()) errors.push('عنوان الدرس والوحدة مطلوب')
  if (!lesson.grade_section_date?.trim()) errors.push('الصف والشعبة والتاريخ مطلوب')
  if (!lesson.objectives?.trim()) errors.push('الأهداف التعليمية مطلوبة')
  return errors
}

export const sortLessonsByDate = (lessons) => {
  return [...lessons].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export const filterLessonsByUnit = (lessons, unit) => {
  if (!unit) return lessons
  return lessons.filter(lesson => lesson.unit === unit)
}
