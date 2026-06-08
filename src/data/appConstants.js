export const NAV_ITEMS = [
  { id: 'dashboard', label: 'ډشبورډ', icon: 'Gauge' },
  { id: 'cases', label: 'قضیې', icon: 'FolderOpen' },
  { id: 'map', label: 'نقشه', icon: 'Map' },
  { id: 'analytics', label: 'تحلیل', icon: 'ChartLine' },
  { id: 'network', label: 'اړیکې', icon: 'Network' },
  { id: 'warrants', label: 'حکمونه', icon: 'Scale' },
  { id: 'phone', label: 'تلیفون', icon: 'Phone' },
  { id: 'social', label: 'ټولنیز', icon: 'Share2' },
  { id: 'keyboard', label: 'کیبورډ', icon: 'Keyboard' },
  { id: 'privacy', label: 'حریم', icon: 'ShieldCheck' },
  { id: 'evidence', label: 'شواهد', icon: 'Link' },
  { id: 'audit', label: 'آډیټ', icon: 'ClipboardList' },
  { id: 'users', label: 'کاروونکي', icon: 'Users' },
  { id: 'health', label: 'حالت', icon: 'HeartPulse' },
  { id: 'behavioral-identity', label: '? ?????? ???? ????', icon: 'BrainCircuit' },
  { id: 'assistant', label: 'AI Assistant', icon: 'Bot' },
  { id: 'settings', label: 'تنظیمات', icon: 'Settings' }
];

export const PROVINCES = ['کابل', 'کندهار', 'هرات', 'ننګرهار', 'بلخ', 'غزني', 'هلمند', 'کندز', 'پکتیا', 'فراه', 'بدخشان', 'خوست'];

export const PRIVACY_RULES = [
  'د قانوني حکم، رول، او audit record پرته هېڅ عملیات نه ثبتېږي.',
  'حقیقي تعقیب باید backend، Supabase Auth، رول-محور اجازه، او قانوني approval سره وصل وي.',
  'User-controlled text sanitize کېږي او مستقیم HTML ته نه اچول کېږي.',
  'Sensitive tokens باید په backend کې وساتل شي، نه په public client bundle کې.'
];
