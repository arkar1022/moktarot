import { cookies } from 'next/headers'
import NatalClient from './NatalClient'

export default function NatalPage() {
  const lang = cookies().get('mok_lang')?.value === 'en' ? 'en' : 'my'
  return <NatalClient initialLang={lang} />
}
