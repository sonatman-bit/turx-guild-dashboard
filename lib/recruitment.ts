import type { WowClass } from '@/lib/guild-data'

export const RECRUIT_NEEDS = ['Yüksek', 'Orta', 'Düşük', 'Kapalı'] as const
export type RecruitNeed = (typeof RECRUIT_NEEDS)[number]

export type RecruitSpecNeed = {
  spec: string
  need: RecruitNeed
}

export type RecruitClassNeed = {
  wowClass: WowClass
  specs: RecruitSpecNeed[]
}

export type StoredRecruitNeed = {
  wowClass: WowClass
  spec: string
  need: RecruitNeed
}

export const DEFAULT_RECRUITMENT_MATRIX: RecruitClassNeed[] = [
  {
    wowClass: 'Warrior',
    specs: [
      { spec: 'Protection', need: 'Düşük' },
      { spec: 'Arms', need: 'Yüksek' },
      { spec: 'Fury', need: 'Yüksek' },
    ],
  },
  {
    wowClass: 'Paladin',
    specs: [
      { spec: 'Protection', need: 'Düşük' },
      { spec: 'Holy', need: 'Yüksek' },
      { spec: 'Retribution', need: 'Yüksek' },
    ],
  },
  {
    wowClass: 'Shaman',
    specs: [
      { spec: 'Elemental', need: 'Yüksek' },
      { spec: 'Enhancement', need: 'Yüksek' },
      { spec: 'Restoration', need: 'Yüksek' },
    ],
  },
  {
    wowClass: 'Druid',
    specs: [
      { spec: 'Feral Combat (Tank)', need: 'Düşük' },
      { spec: 'Balance', need: 'Yüksek' },
      { spec: 'Restoration', need: 'Yüksek' },
    ],
  },
  {
    wowClass: 'Mage',
    specs: [
      { spec: 'Arcane', need: 'Yüksek' },
      { spec: 'Fire', need: 'Yüksek' },
      { spec: 'Frost', need: 'Yüksek' },
    ],
  },
  {
    wowClass: 'Warlock',
    specs: [
      { spec: 'Affliction', need: 'Yüksek' },
      { spec: 'Demonology', need: 'Yüksek' },
      { spec: 'Destruction', need: 'Yüksek' },
    ],
  },
  {
    wowClass: 'Priest',
    specs: [
      { spec: 'Discipline', need: 'Yüksek' },
      { spec: 'Holy', need: 'Yüksek' },
      { spec: 'Shadow', need: 'Yüksek' },
    ],
  },
  {
    wowClass: 'Hunter',
    specs: [
      { spec: 'Beast Mastery', need: 'Yüksek' },
      { spec: 'Marksmanship', need: 'Yüksek' },
      { spec: 'Survival', need: 'Yüksek' },
    ],
  },
  {
    wowClass: 'Rogue',
    specs: [
      { spec: 'Assassination', need: 'Yüksek' },
      { spec: 'Combat', need: 'Yüksek' },
      { spec: 'Subtlety', need: 'Yüksek' },
    ],
  },
]

export function isRecruitNeed(value: string): value is RecruitNeed {
  return (RECRUIT_NEEDS as readonly string[]).includes(value)
}

export function isRecruitClass(value: string): value is WowClass {
  return DEFAULT_RECRUITMENT_MATRIX.some((row) => row.wowClass === value)
}

export function mergeRecruitmentMatrix(stored: StoredRecruitNeed[] | undefined): RecruitClassNeed[] {
  const overrides = new Map<string, RecruitNeed>()
  for (const item of stored || []) {
    if (!isRecruitClass(item.wowClass) || !isRecruitNeed(item.need) || !item.spec) continue
    overrides.set(`${item.wowClass}::${item.spec}`, item.need)
  }
  return DEFAULT_RECRUITMENT_MATRIX.map((row) => ({
    wowClass: row.wowClass,
    specs: row.specs.map((spec) => ({
      spec: spec.spec,
      need: overrides.get(`${row.wowClass}::${spec.spec}`) || spec.need,
    })),
  }))
}

export function flattenRecruitmentMatrix(matrix: RecruitClassNeed[]): StoredRecruitNeed[] {
  return matrix.flatMap((row) =>
    row.specs.map((spec) => ({
      wowClass: row.wowClass,
      spec: spec.spec,
      need: spec.need,
    })),
  )
}
