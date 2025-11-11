import { cookies } from 'next/headers'
import HistoryClient from './HistoryClient'

export default function HistoryPage() {
  const lang = cookies().get('mok_lang')?.value === 'en' ? 'en' : 'my'
  return <HistoryClient initialLang={lang} />
}
