export const LESSON_FIELDS = [
  {
    id: 'title_unit',
    label: 'عنوان الدرس والوحدة',
    placeholder: 'مثال: الإعراب - الوحدة الأولى',
  },
  {
    id: 'grade_section_date',
    label: 'الصف والشعبة والتاريخ',
    placeholder: 'مثال: الصف الثامن / الشعبة (أ) - 2024/01/15',
  },
  {
    id: 'objectives',
    label: 'الأهداف التعليمية (السلوكية)',
    placeholder: 'يتوقع من الطالب في نهاية الحصة أن:\n- يتعرف على...\n- يستخدم...',
    type: 'textarea',
  },
  {
    id: 'resources',
    label: 'الوسائل والأدوات التعليمية',
    placeholder: 'مثال: السبورة، الكتاب المدرسي، أوراق عمل',
    type: 'textarea',
  },
  {
    id: 'introduction',
    label: 'التمهيد (التهيئة للدرس)',
    placeholder: 'ابدأ بسؤال تحريضي أو قصة قصيرة تشد الانتباه',
    type: 'textarea',
  },
  {
    id: 'procedures',
    label: 'إجراءات الدرس وخطواته',
    placeholder: 'خطوة 1 (5 دقائق): ...\nخطوة 2 (15 دقيقة): ...\nخطوة 3 (15 دقيقة): ...',
    type: 'textarea',
  },
  {
    id: 'activities',
    label: 'الأنشطة الصفية',
    placeholder: 'نشاط 1: ...\nنشاط 2: ...',
    type: 'textarea',
  },
  {
    id: 'assessment',
    label: 'التقويم (أثناء الحصة)',
    placeholder: 'أسئلة لقياس الفهم:\n- س1: ...\n- س2: ...',
    type: 'textarea',
  },
  {
    id: 'homework',
    label: 'الواجب المنزلي / التقويم الختامي',
    placeholder: 'مثال: اكتب موضوع عن... أو اجب عن الأسئلة من 1-5',
    type: 'textarea',
  },
]

export const GRADES = [
  'الصف السابع',
  'الصف الثامن',
  'الصف التاسع',
]

export const SECTIONS = ['أ', 'ب', 'ج', 'د', 'هـ']

export const UNITS_GRADE_8 = [
  'الوحدة الأولى: القراءة والاستيعاب',
  'الوحدة الثانية: النحو والصرف',
  'الوحدة الثالثة: التعبير الكتابي',
  'الوحدة الرابعة: الأدب والنقد',
  'الوحدة الخامسة: الثقافة اللغوية',
]

export const RHETORICAL_TERMS_LIMIT = 4
export const LESSON_DURATION = 45 // minutes

export const DEFAULT_LESSON = {
  title_unit: '',
  grade_section_date: '',
  objectives: '',
  resources: '',
  introduction: '',
  procedures: '',
  activities: '',
  assessment: '',
  homework: '',
  unit: '',
  rhetorical_terms: [],
  notes: '',
}

export const PDF_UPLOAD_TYPES = {
  TEACHER_GUIDE: 'teacher-guide',
  STUDENT_BOOK: 'student-book',
}
