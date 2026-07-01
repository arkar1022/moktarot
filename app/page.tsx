import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import LoginClient from './LoginClient'
import { isWithoutDbMode } from '@/lib/runtime'

export default function HomePage() {
  if (isWithoutDbMode()) {
    redirect('/app/dashboard')
  }

  const lang = cookies().get('mok_lang')?.value === 'en' ? 'en' : 'my'
  return <LoginClient initialLang={lang} />
}
