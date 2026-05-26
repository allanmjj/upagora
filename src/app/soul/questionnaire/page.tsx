import SoulQuestionnaire from '@/components/soul/SoulQuestionnaire'

export const metadata = {
  title: 'Soul Questionnaire — UpAgora',
  description: 'Map your personality across 7 dimensions to create your soul profile',
}

export default function SoulQuestionnairePage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <SoulQuestionnaire />
    </div>
  )
}
