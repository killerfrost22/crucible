import type { Intake } from './types'

export interface Scenario {
  id: string
  label: string
  intake: Intake
}

// Same intakes as backend/eval/scenarios.json (and, for the bakery, backend/eval/demos/) so live answers can be
// compared with the recorded ones.
export const SCENARIOS: Scenario[] = [
  {
    id: 'bakery-second-location',
    label: 'Bakery · second location',
    intake: {
      question: 'Should I open a second location for my bakery, or invest in delivery first?',
      leaning: 'Open the second location. A storefront just came up for lease on Route 1.',
      profile: {
        name: 'Rise & Shine Bakery',
        industry: 'neighborhood bakery and cafe',
        location: 'College Park, Maryland',
        size: '1 location, 7 employees',
        current_tools: ['Square POS', 'Instagram', 'Google Business Profile'],
        budget: '$90,000 in savings',
        goals: ['grow revenue', "don't put the first store at risk"],
        constraints:
          'Revenue is about $42,000 a month. Savings cover six months of runway. I bake every morning myself and have no manager yet.',
      },
    },
  },
  {
    id: 'dental-ai-receptionist',
    label: 'Dental office · AI receptionist',
    intake: {
      question:
        'Should we replace our front-desk phone line with an AI receptionist that answers, books appointments, and records calls?',
      leaning: 'Yes — sign up for an AI receptionist this month',
      profile: {
        name: 'Bright Smile Family Dental',
        industry: 'dental practice',
        location: 'Silver Spring, Maryland',
        size: '2 dentists, 6 staff',
        current_tools: ['Dentrix', 'Google Workspace', 'RingCentral'],
        budget: '$400/month',
        goals: ['stop missing new-patient calls', 'free up front-desk time'],
        constraints: 'Front desk is one person',
      },
    },
  },
  {
    id: 'hvac-ai-promo-texts',
    label: 'HVAC · AI promo texts',
    intake: {
      question: 'Should we use an AI marketing tool to text all our past customers a fall tune-up promo?',
      leaning: 'Yes, blast the whole list next week',
      profile: {
        name: '',
        industry: 'HVAC repair and installation',
        location: 'Frederick, Maryland',
        size: '4 technicians',
        current_tools: ['Housecall Pro', 'QuickBooks Online'],
        budget: '$150/month',
        goals: ['fill the fall schedule'],
        constraints: '',
      },
    },
  },
  {
    id: 'coffee-tip-pool-managers',
    label: 'Coffee shop · tip pool',
    intake: {
      question: "Should my two shift managers start sharing in the baristas' tip pool? They work the floor too.",
      leaning: 'Yes, it feels fair',
      profile: {
        name: '',
        industry: 'coffee shop',
        location: 'College Park, Maryland',
        size: '1 location, 9 employees',
        current_tools: ['Square POS', '7shifts'],
        budget: '',
        goals: ['keep staff morale high', 'reduce turnover'],
        constraints: '',
      },
    },
  },
]
