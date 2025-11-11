import { cookies } from 'next/headers'
import LoginClient from './LoginClient'

export default function HomePage() {
  const lang = cookies().get('mok_lang')?.value === 'en' ? 'en' : 'my'
  return <LoginClient initialLang={lang} />
}
