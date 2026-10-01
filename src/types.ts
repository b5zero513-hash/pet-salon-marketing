export type Channel = 'instagram' | 'line' | 'flyer'

export type SalonForm = {
  shopName: string
  area: string
  services: string
  strengths: string
  target: string
  reservation: string
  tone: string
  goal: string
  offer: string
  price: string
  startsAt: string
  endsAt: string
  conditions: string
  extra: string
}

export type CopySet = {
  campaignName: string
  summary: string
  instagram: string
  line: string
  flyer: string
}

export const channels: { id: Channel; label: string; short: string }[] = [
  { id: 'instagram', label: 'Instagram', short: '写真と一緒に魅力を伝える' },
  { id: 'line', label: 'LINE配信', short: '大切なお知らせを短く届ける' },
  { id: 'flyer', label: 'チラシ', short: '見出しから内容が伝わる紙面' },
]
