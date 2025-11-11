import { cookies } from 'next/headers'
import GuidanceClient from './GuidanceClient'

export default function GuidancePage() {
  const lang = cookies().get('mok_lang')?.value === 'en' ? 'en' : 'my'
  return <GuidanceClient initialLang={lang} />
}
