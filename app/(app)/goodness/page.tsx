import { cookies } from 'next/headers'
import GoodnessClient from './GoodnessClient'

export default function GoodnessPage() {
  const lang = cookies().get('mok_lang')?.value === 'en' ? 'en' : 'my'
  return <GoodnessClient initialLang={lang} />
}
