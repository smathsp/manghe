// 传说级产品 (8个)
const legendary = [
  { id: 1,  name: '赤金寂寞卡',   icon: '🃏', image: '/images/赤金寂寞卡.png', rarity: 'legendary' },
  { id: 2,  name: '赤金天火卡',   icon: '🔥', image: '/images/赤金天火卡.png', rarity: 'legendary' },
  { id: 3,  name: 'C2000MAX',     icon: '⚡', image: '/images/C2000MAX.png', rarity: 'legendary' },
  { id: 4,  name: 'C8-788',       icon: '💎', image: '/images/C8-788.png', rarity: 'legendary' },
  { id: 5,  name: 'C5800-688',    icon: '👑', image: '/images/C5800-688.png', rarity: 'legendary' },
  { id: 6,  name: 'AK68-798',     icon: '🌟', image: '/images/AK68-798.png', rarity: 'legendary' },
  { id: 7,  name: 'NBCPE-688',    icon: '✨', image: '/images/NBCPE-688.png', rarity: 'legendary' },
  { id: 8,  name: 'N6800',        icon: '🏆', image: '/images/N6800.png', rarity: 'legendary' },
]

// 稀有级产品 (7个)
const rare = [
  { id: 9,  name: '标准寂寞卡',   icon: '🎯', image: '/images/标准寂寞卡.png', rarity: 'rare' },
  { id: 10, name: '标准天火卡',   icon: '🎪', image: '/images/标准天火卡.png', rarity: 'rare' },
  { id: 11, name: 'C2000PRO+',    icon: '🔮', image: '/images/C2000PRO+.png', rarity: 'rare' },
  { id: 12, name: 'C8-618',       icon: '🎭', image: '/images/C8-788.png', rarity: 'rare' },
  { id: 13, name: 'AM5',          icon: '🎲', image: '/images/AM5.png', rarity: 'rare' },
  { id: 14, name: 'C2000-518',    icon: '🎴', image: '/images/C2000-518.png', rarity: 'rare' },
  { id: 15, name: 'C5800-650',    icon: '💠', image: '/images/C5800-688.png', rarity: 'rare' },
]

// 普通级产品 (21个)
const common = [
  { id: 16, name: 'CC-4G',       rarity: 'common' },
  { id: 17, name: 'CC-5G',       rarity: 'common' },
  { id: 18, name: 'CC-全球',     rarity: 'common' },
  { id: 19, name: 'TT-4G',       rarity: 'common' },
  { id: 20, name: 'TT-5G',       rarity: 'common' },
  { id: 21, name: 'TT-全球',     rarity: 'common' },
  { id: 22, name: 'DD-5G',       rarity: 'common' },
  { id: 23, name: 'C2000-4G',    rarity: 'common' },
  { id: 24, name: 'C8-4G',       rarity: 'common' },
  { id: 25, name: 'C5800-4G',    rarity: 'common' },
  { id: 26, name: 'C6-4G',       rarity: 'common' },
  { id: 27, name: 'C9-4G',       rarity: 'common' },
  { id: 28, name: 'CU-4G',       rarity: 'common' },
  { id: 29, name: 'N180',        rarity: 'common' },
  { id: 30, name: 'N1150',       rarity: 'common' },
  { id: 31, name: 'N6300',       rarity: 'common' },
  { id: 32, name: 'N3300',       rarity: 'common' },
  { id: 33, name: 'H500',        rarity: 'common' },
  { id: 34, name: 'H1000',       rarity: 'common' },
  { id: 35, name: 'U2000',       rarity: 'common' },
  { id: 36, name: 'U3000',       rarity: 'common' },
]

export const ITEMS = [...legendary, ...rare, ...common]

// 稀有度配置
export const RARITY_CONFIG = {
  legendary: {
    label: '传说',
    max: legendary.length,
  },
  rare: {
    label: '稀有',
    max: rare.length,
  },
  common: {
    label: '普通',
    max: common.length,
  },
}
