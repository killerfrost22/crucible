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
    id: 'bakery-route1-lease',
    label: 'Bakery · Route 1 lease',
    intake: {
      question: 'Should I sign the lease on the Route 1 storefront for our second location now?',
      leaning: 'Sign it. The board told us to test first; we ran the 90-day test, and the conditions it set are now met.',
      profile: {
        name: 'Rise & Shine Bakery',
        industry: 'neighborhood bakery and cafe',
        location: 'College Park, Maryland',
        size: '1 location, 10 employees, including a full-time manager',
        current_tools: ['Square POS', 'Square Online', 'Instagram', 'Google Business Profile'],
        budget: '$108,000 in savings, plus a $35,000 SBA microloan approved for equipment',
        goals: ['grow revenue', "don't put the first store at risk"],
        constraints:
          "90-day test results. First store: netted $6,100, $5,800 and $6,400 a month after my $5,000 salary, reconciled by my bookkeeper; revenue is now $47,000 a month, and last summer's 20% dip still broke even. Square Online delivery: $4,300 a month at $3.90 profit per order after fees; DoorDash lost money, so I stopped it at day 60. Staff: my manager and a second employee both hold the certified food service manager credential; the manager has run the first store without me for ten weeks and will keep it. Route 1 demand: six Saturday pop-ups in the space averaged $1,150, 70% from customers new to our Square directory. Space: a former cafe 1.5 miles away with a hood, grease trap and three-phase power. Lease, reviewed by my attorney: $2,950 a month gross, 3% yearly increases, three years plus a renewal option, bakery exclusive, no personal guarantee, and an exit after 12 months for four months' rent. A signed letter from the landlord pays the $40,000 allowance to the contractor in two draws, covers any hood, grease trap or electrical repairs, and starts rent at the occupancy permit, followed by three months free. Build-out: a fixed-price $52,000 contract, so our share is $12,000 plus a $5,200 contingency. The SBA lender confirmed in writing that the $35,000 microloan pays for equipment at signing. Prince George's County health plan review for a former food space takes 6-8 weeks, per our pre-application meeting. Cash: about $23,000 comes out of savings, leaving $85,000. Downside case built with the Maryland SBDC (Route 1 at 60% of the first store's sales, a 30% overrun, a two-month late opening, a summer dip): the first store stays profitable and savings never fall below $78,000. The landlord needs an answer within two weeks.",
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
