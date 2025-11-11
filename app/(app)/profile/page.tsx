import { cookies } from 'next/headers'
import ProfileClient from './ProfileClient'

export default function ProfilePage() {
  const lang = cookies().get('mok_lang')?.value === 'en' ? 'en' : 'my'
  return <ProfileClient initialLang={lang} />
}
