import type { Channel, CopySet, SalonForm } from '../types'

const clean = (value: string) => value.trim()
const join = (...parts: (string | undefined | false)[]) => parts.filter(Boolean).join('\n')

export function formatPeriod(form: SalonForm) {
  const start = clean(form.startsAt)
  const end = clean(form.endsAt)
  const format = (date: string) => {
    const [year, month, day] = date.split('-').map(Number)
    return `${year}年${month}月${day}日`
  }
  if (start && end) return `${format(start)}〜${format(end)}`
  if (start) return `${format(start)}から`
  if (end) return `${format(end)}まで`
  return ''
}

function campaignName(form: SalonForm) {
  const source = clean(form.offer) || clean(form.services)
  const short = source.length > 22 ? `${source.slice(0, 22)}…` : source
  return `${short}キャンペーン`
}

function cta(form: SalonForm, channel: Channel) {
  const reservation = clean(form.reservation)
  if (!reservation) return '予約方法を入力してください。'
  if (channel === 'line') return `ご予約・お問い合わせは「${reservation}」へご連絡ください。`
  if (channel === 'flyer') return `ご予約・お問い合わせ先：${reservation}`
  return `ご予約・お問い合わせは「${reservation}」へ。`
}

function toneLine(form: SalonForm) {
  switch (clean(form.tone)) {
    case '明るく元気': return 'この季節のお手入れを、明るくお知らせします！'
    case '落ち着いて上品': return '愛犬との暮らしに寄り添う、丁寧なお知らせです。'
    default: return '大切なご家族に向けた、お手入れのお知らせです。'
  }
}

function greeting(form: SalonForm) {
  switch (clean(form.tone)) {
    case '明るく元気': return `${clean(form.shopName)}から、うれしいお知らせです！`
    case '落ち着いて上品': return `${clean(form.shopName)}から、今回のご案内をお届けします。`
    default: return `${clean(form.shopName)}より、今回のお知らせをお届けします。`
  }
}

export function generateCopy(form: SalonForm): CopySet {
  const name = campaignName(form)
  const period = formatPeriod(form)
  const price = clean(form.price)
  const conditions = clean(form.conditions)
  const extra = clean(form.extra)
  const offer = clean(form.offer)
  const details = join(
    offer && `【特典】${offer}`,
    price && `【料金】${price}`,
    period && `【期間】${period}`,
    conditions && `【対象・条件】${conditions}`,
    extra && `【ご案内】${extra}`,
  )
  const missing = [!price && '料金', !period && '期間', !conditions && '適用条件'].filter(Boolean).join('・')
  const reservationNote = clean(form.reservation) || '予約方法は未設定です。'

  const instagram = join(
    `${clean(form.area)}の${clean(form.shopName)}です。`,
    `今回のお知らせです。目的は「${clean(form.goal)}」です。`,
    toneLine(form),
    `${clean(form.target)}へ。${clean(form.strengths)}`,
    clean(form.services) && `当店では${clean(form.services)}をご用意しています。`,
    '',
    `今回のお知らせ：${offer}`,
    price && `料金：${price}`,
    period && `期間：${period}`,
    conditions && `対象・条件：${conditions}`,
    extra,
    '',
    cta(form, 'instagram'),
    `#${clean(form.shopName).replace(/[\s・]/g, '')} #${clean(form.area).replace(/[\s・]/g, '')} #犬のトリミング #ペットサロン`,
  )

  const line = join(
    greeting(form),
    `今回の目的：${clean(form.goal)}`,
    '',
    `今回の特典：${offer}`,
    price && `料金：${price}`,
    period && `期間：${period}`,
    conditions && `条件：${conditions}`,
    extra,
    '',
    cta(form, 'line'),
  )

  const flyer = join(
    `＼ ${clean(form.area)}の犬のトリミングサロン ／`,
    `【${name}】`,
    toneLine(form),
    `${offer}`,
    '',
    `こんなお店です`,
    `${clean(form.shopName)}では、${clean(form.strengths)}`,
    `対象：${clean(form.target)}`,
    clean(form.services) && `メニュー：${clean(form.services)}`,
    '',
    details,
    '',
    cta(form, 'flyer'),
  )

  const summary = join(
    `目的：${clean(form.goal)}`,
    `対象：${clean(form.target)}`,
    `特典：${offer}`,
    price ? `料金：${price}` : '料金：設定なし',
    period ? `期間：${period}` : '期間：設定なし',
    conditions ? `条件：${conditions}` : '条件：設定なし',
    `予約方法：${reservationNote}`,
    missing && `未設定の項目：${missing}`,
  )

  return { campaignName: name, summary, instagram, line, flyer }
}

export function getFormErrors(form: SalonForm) {
  const errors: Partial<Record<keyof SalonForm, string>> = {}
  const required: (keyof SalonForm)[] = ['shopName', 'area', 'services', 'strengths', 'target', 'goal', 'offer']
  for (const key of required) if (!clean(form[key])) errors[key] = 'この項目を入力してください。'
  if (form.startsAt && form.endsAt && form.startsAt > form.endsAt) errors.endsAt = '終了日は開始日以降の日付にしてください。'
  return errors
}
