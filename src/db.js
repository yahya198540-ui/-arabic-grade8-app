import Dexie from 'dexie'

export const db = new Dexie('ArabicLessonPrepDB')

db.version(1).stores({
  lessons: '++id, createdAt, unit, date',
  attachments: '++id, lessonsId',
  settings: 'key'
})

export const getLessons = async () => {
  return await db.lessons.toArray()
}

export const getLesson = async (id) => {
  return await db.lessons.get(id)
}

export const saveLesson = async (lesson) => {
  if (lesson.id) {
    return await db.lessons.update(lesson.id, lesson)
  }
  return await db.lessons.add({
    ...lesson,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}

export const deleteLesson = async (id) => {
  await db.attachments.where('lessonId').equals(id).delete()
  return await db.lessons.delete(id)
}

export const saveAttachment = async (lessonId, file, type) => {
  const arrayBuffer = await file.arrayBuffer()
  return await db.attachments.add({
    lessonId,
    name: file.name,
    type, // 'teacher-guide' or 'student-book'
    data: arrayBuffer,
    size: file.size,
    uploadedAt: new Date(),
  })
}

export const getAttachments = async (lessonId) => {
  return await db.attachments.where('lessonId').equals(lessonId).toArray()
}

export const deleteAttachment = async (id) => {
  return await db.attachments.delete(id)
}

export const searchLessons = async (query) => {
  return await db.lessons.filter(lesson =>
    lesson.title.includes(query) ||
    lesson.unit.includes(query)
  ).toArray()
}
