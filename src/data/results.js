import { ITEMS } from './items.js'

const VOTES = {
  legendary: [267, 278, 241, 184, 102, 162, 225, 89],
  rare: [278, 290, 300, 214, 107, 155, 153],
  common: [101, 251, 210, 93, 224, 202, 225, 126, 87, 111, 37, 43, 21, 32, 46, 93, 79, 44, 60, 59, 85],
}

const LIMITS = {
  legendary: 5,
  rare: 5,
  common: 10,
}

const RESULT_ITEM_OVERRIDES = {
  legendary: {
    7: {
      name: 'C5800-688',
      image: '/images/C5800-688-result.png',
    },
  },
}

export const RESULT_GROUPS = [
  { key: 'legendary', label: '传说', eyebrow: 'LEGENDARY', color: 'gold' },
  { key: 'rare', label: '稀有', eyebrow: 'RARE', color: 'red' },
  { key: 'common', label: '普通', eyebrow: 'COMMON', color: 'purple' },
].map(group => {
  const candidates = ITEMS
    .filter(item => item.rarity === group.key)
    .map((item, index) => ({
      ...item,
      ...RESULT_ITEM_OVERRIDES[group.key]?.[item.id],
      votes: VOTES[group.key][index],
    }))
    .sort((a, b) => b.votes - a.votes)

  return {
    ...group,
    limit: LIMITS[group.key],
    totalVotes: candidates.reduce((sum, item) => sum + item.votes, 0),
    winners: candidates.slice(0, LIMITS[group.key]),
  }
})

export const TOTAL_BALLOTS = Object.values(VOTES)
  .flat()
  .reduce((sum, votes) => sum + votes, 0)
