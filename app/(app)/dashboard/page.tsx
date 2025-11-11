import { cookies } from 'next/headers'
import DashboardClient from './DashboardClient'

export default function DashboardPage() {
  const lang = cookies().get('mok_lang')?.value === 'en' ? 'en' : 'my'
  return <DashboardClient initialLang={lang} />
}
