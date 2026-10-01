import { useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowRight, Check, ChevronDown, Clipboard, Heart, Instagram, MessageCircle, PawPrint, RotateCcw, Sparkles, Store, Ticket, Megaphone, Printer } from 'lucide-react'
import { generateCopy, getFormErrors } from './lib/generate'
import { sampleForm } from './sample'
import { channels, type Channel, type CopySet, type SalonForm } from './types'

const blankForm: SalonForm = Object.fromEntries(Object.keys(sampleForm).map((key) => [key, ''])) as unknown as SalonForm

const fieldGroups = [
  {
    title: 'お店のこと',
    description: 'いつものお店の情報を入力します。サンプルを編集して試すこともできます。',
    icon: Store,
    fields: [
      { key: 'shopName', label: '店舗名', placeholder: '例：こもれびトリミング', required: true },
      { key: 'area', label: 'エリア', placeholder: '例：世田谷区・用賀駅周辺', required: true },
      { key: 'services', label: '主なサービス', placeholder: '例：シャンプー、全身カット、爪切り', required: true, multiline: true },
      { key: 'strengths', label: 'お店の特徴・強み', placeholder: '例：1頭ずつの予約制。施術前に丁寧にお話を伺います。', required: true, multiline: true },
      { key: 'target', label: '届けたいお客様', placeholder: '例：近隣にお住まいの小型犬の飼い主さま', required: true, multiline: true },
      { key: 'reservation', label: '予約・問い合わせ先', placeholder: '例：LINE公式アカウント ／ 電話 03-xxxx-xxxx', hint: '未入力でも作成できます。空欄なら予約方法を勝手に作りません。' },
      { key: 'tone', label: 'お店らしい雰囲気', type: 'select', options: ['親しみやすく丁寧', '明るく元気', '落ち着いて上品'] },
    ],
  },
  {
    title: '今回のお知らせ',
    description: 'キャンペーンの目的や特典を教えてください。価格・期間は決まっている場合だけ入力します。',
    icon: Ticket,
    fields: [
      { key: 'goal', label: '今回の目的', placeholder: '例：秋の新規来店を増やす', required: true },
      { key: 'offer', label: 'サービス・特典', placeholder: '例：初回ご利用で肉球ケア無料', required: true, multiline: true },
      { key: 'price', label: '料金・割引条件', placeholder: '任意：例 3,300円（税込）／対象コース10%割引', multiline: true, hint: '未入力なら価格や割引率を原稿に追加しません。' },
      { key: 'startsAt', label: '開始日', type: 'date', hint: '任意。開始日のみでも入力できます。' },
      { key: 'endsAt', label: '終了日', type: 'date' },
      { key: 'conditions', label: '対象・適用条件', placeholder: '任意：例 初めてご利用の方。事前予約制。', multiline: true, hint: '決まっている条件だけ入力してください。' },
      { key: 'extra', label: 'そのほか伝えたいこと', placeholder: '任意：例 ご予約時に「秋のケア」とお伝えください。', multiline: true },
    ],
  },
] as const

function App() {
  const [form, setForm] = useState<SalonForm>(sampleForm)
  const [selected, setSelected] = useState<Channel[]>(['instagram', 'line', 'flyer'])
  const [result, setResult] = useState<CopySet>(() => generateCopy(sampleForm))
  const [errors, setErrors] = useState<Partial<Record<keyof SalonForm, string>>>({})
  const [notice, setNotice] = useState('')
  const resultsRef = useRef<HTMLElement>(null)

  const selectedLabels = useMemo(() => channels.filter((channel) => selected.includes(channel.id)), [selected])

  const update = (key: keyof SalonForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const toggleChannel = (channel: Channel) => {
    setSelected((current) => current.includes(channel) ? current.filter((item) => item !== channel) : [...current, channel])
  }

  const generate = () => {
    if (selected.length === 0) {
      setNotice('作りたい媒体を1つ以上選んでください。')
      return
    }
    // Read the visible values at submit time as well, so clearing an optional
    // field can never leave its previous value in a generated draft.
    const currentForm = { ...form }
    ;(Object.keys(currentForm) as (keyof SalonForm)[]).forEach((key) => {
      const control = document.getElementById(key)
      if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement) {
        currentForm[key] = control.value
      }
    })
    setForm(currentForm)
    const nextErrors = getFormErrors(currentForm)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setNotice('入力が必要な項目を確認してください。')
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }
    setResult(generateCopy(currentForm))
    setNotice('販促セットができました。必要に応じて文章を編集してください。')
    window.setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

  const resetSample = () => {
    setForm(sampleForm)
    setSelected(['instagram', 'line', 'flyer'])
    setResult(generateCopy(sampleForm))
    setErrors({})
    setNotice('サンプルを表示しました。')
    window.setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

  const clearForm = () => {
    if (!window.confirm('入力内容をすべて消去します。よろしいですか？')) return
    setForm(blankForm)
    setSelected(['instagram', 'line', 'flyer'])
    setResult({ campaignName: '販促セットを作ると表示されます', summary: 'お店とキャンペーン情報を入力して、販促セットを作ってください。', instagram: '', line: '', flyer: '' })
    setErrors({})
    setNotice('入力内容を消去しました。必要な項目を入力してください。')
  }

  const copyText = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setNotice(`${label}をコピーしました。`)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.append(textarea)
      textarea.select()
      const copied = document.execCommand('copy')
      textarea.remove()
      setNotice(copied ? `${label}をコピーしました。` : 'コピーできませんでした。文章を選択してコピーしてください。')
    }
  }

  const editResult = (key: keyof CopySet, value: string) => setResult((current) => ({ ...current, [key]: value }))

  return (
    <div className="app-shell">
      <header className="topbar">
        <a href="#top" className="brand" aria-label="Salon Letter ホーム">
          <span className="brand-mark"><PawPrint size={21} strokeWidth={2.4} /></span>
          <span>salon letter<span className="brand-dot">.</span></span>
        </a>
        <div className="topbar-right"><span className="demo-pill"><span /> デモ版</span><a className="top-link" href="#how-it-works">使い方 <ArrowDown size={15} /></a></div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" />PET SALON PROMOTION TOOL</div>
            <h1>お店の魅力を、<br /><span className="hero-headline-line"><em>伝わる販促文</em>に。</span></h1>
            <p className="hero-lead">いつものお店の情報を入れるだけ。<br className="desktop-break" />Instagram・LINE・チラシの文章を、媒体に合わせてまとめて作れます。</p>
            <div className="hero-actions">
              <button className="button button-primary" onClick={() => { resetSample(); document.getElementById('editor')?.scrollIntoView({ behavior: 'smooth' }) }}>
                サンプルで試してみる <ArrowRight size={18} />
              </button>
              <span className="no-api-note"><Check size={15} /> API登録不要・無料デモ</span>
            </div>
            <div className="hero-trust"><span><Check size={15} />入力例つき</span><span><Check size={15} />文章はあとから編集OK</span><span><Check size={15} />入力内容は送信されません</span></div>
          </div>
          <div className="hero-art" aria-label="やさしい表情のトイプードル" role="img">
            <div className="art-sun" /><div className="art-halo" /><div className="art-flower flower-one">✿</div><div className="art-flower flower-two">✿</div>
            <img className="poodle-hero" src="/images/toy-poodle-cutout.png" alt="" />
            <div className="art-note"><span><Sparkles size={16} /></span><b>お店らしさを大切に</b><small>伝わる言葉を、ひとつずつ。</small></div>
            <div className="art-sticker"><Heart size={17} fill="currentColor" /><span>大切な家族に<br />やさしいケアを</span></div>
            <div className="art-label">YOUR LOCAL PET SALON</div>
          </div>
          <div className="hero-bottom"><span>01</span><div /><span>お店の情報から販促セットを作成</span></div>
        </section>

        <section className="how-section" id="how-it-works">
          <div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" />かんたん 3 STEP</div><h2>入力して、選んで、できあがり。</h2></div><p>むずかしい設定はありません。<br />サンプルを使って、気軽にお試しください。</p></div>
          <div className="steps-grid">
            <div className="step-card"><span className="step-number">01</span><div className="step-icon"><Store size={23} /></div><h3>お店のことを入力</h3><p>お店の特徴や、今回のお知らせ内容を入力します。</p></div>
            <div className="step-connector"><ArrowRight size={18} /></div>
            <div className="step-card"><span className="step-number">02</span><div className="step-icon"><Megaphone size={23} /></div><h3>届けたい媒体を選ぶ</h3><p>Instagram・LINE・チラシから選べます。</p></div>
            <div className="step-connector"><ArrowRight size={18} /></div>
            <div className="step-card"><span className="step-number">03</span><div className="step-icon"><Clipboard size={23} /></div><h3>文章を編集・コピー</h3><p>できた文章を整えて、お好きな場所へコピー。</p></div>
          </div>
        </section>

        <section className="workspace" id="editor">
          <div className="workspace-heading">
            <div><div className="eyebrow"><span className="eyebrow-line" />PROMOTION WORKSPACE</div><h2>販促セットを作ってみましょう</h2><p>サンプル情報を入れてあります。まずはこのまま「販促セットを作る」を押してみてください。</p></div>
            <button className="text-button" onClick={resetSample}><RotateCcw size={16} />サンプルに戻す</button>
          </div>

          <div className="workspace-grid">
            <div className="form-column">
              {fieldGroups.map((group, groupIndex) => {
                const GroupIcon = group.icon
                return <section className="form-card" key={group.title}>
                  <div className="form-card-heading"><span className="form-step">0{groupIndex + 1}</span><div className="form-title-icon"><GroupIcon size={20} /></div><div><h3>{group.title}</h3><p>{group.description}</p></div></div>
                  <div className="fields-grid">
                    {group.fields.map((field) => {
                      const key = field.key as keyof SalonForm
                      const error = errors[key]
                      const common = { id: key, name: key, value: form[key], onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => update(key, event.target.value), placeholder: 'placeholder' in field ? field.placeholder : undefined, 'aria-invalid': Boolean(error), 'aria-describedby': error ? `${key}-error` : undefined }
                      return <div className={`field ${'multiline' in field && field.multiline ? 'field-wide' : ''}`} key={field.key}>
                        <label htmlFor={key}>{field.label}{'required' in field && field.required && <span className="required-mark">必須</span>}{'required' in field && !field.required && <span className="optional-mark">任意</span>}{!('required' in field) && <span className="optional-mark">任意</span>}</label>
                        {'options' in field
                          ? <select {...common}><option value="">選んでください</option>{field.options.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                          : 'multiline' in field && field.multiline
                          ? <textarea {...common} rows={3} />
                          : <input {...common} type={'type' in field ? field.type : 'text'} />}
                        {'hint' in field && field.hint && <small className="field-hint">{field.hint}</small>}
                        {error && <small className="field-error" id={`${key}-error`}>{error}</small>}
                      </div>
                    })}
                  </div>
                </section>
              })}

              <section className="form-card channel-card">
                <div className="form-card-heading"><span className="form-step">03</span><div className="form-title-icon"><Megaphone size={20} /></div><div><h3>どこで発信しますか？</h3><p>作りたい媒体を選んでください。複数選択できます。</p></div></div>
                <div className="channel-options">
                  {channels.map((channel) => <label className={`channel-option ${selected.includes(channel.id) ? 'is-selected' : ''}`} key={channel.id}>
                    <input type="checkbox" checked={selected.includes(channel.id)} onChange={() => toggleChannel(channel.id)} />
                    <span className="fake-check">{selected.includes(channel.id) && <Check size={14} />}</span>
                    <span className="channel-copy"><b>{channel.label}</b><small>{channel.short}</small></span>
                    <span className="channel-icon">{channel.id === 'instagram' ? <Instagram size={19} /> : channel.id === 'line' ? <MessageCircle size={19} /> : <Printer size={19} />}</span>
                  </label>)}
                </div>
              </section>
              <div className="form-actions"><button className="button button-primary generate-button" onClick={generate}><Sparkles size={18} />販促セットを作る<ArrowRight size={18} /></button><button className="clear-button" onClick={clearForm}>入力をすべて消去</button></div>
              <p className="privacy-note"><Check size={14} />入力内容はこの画面内だけで処理され、送信・保存されません。</p>
            </div>

            <aside className="preview-column" aria-label="作成できる販促文のプレビュー">
              <div className="preview-topline"><span className="preview-dot" />できあがりイメージ<span className="preview-live">LIVE PREVIEW</span></div>
              <div className="preview-heading"><span className="preview-kicker">CAMPAIGN IDEA</span><h3>{form.offer || '特典を入力すると、ここに表示されます'}</h3><div className="preview-meta"><span><PawPrint size={14} />{form.area || 'エリア'}</span><span><Ticket size={14} />{form.startsAt || form.endsAt ? '期間設定あり' : '期間自由'}</span></div></div>
              <div className="preview-divider" />
              <div className="preview-channel-list">{selectedLabels.length ? selectedLabels.map((channel, index) => {
                const Icon = channel.id === 'instagram' ? Instagram : channel.id === 'line' ? MessageCircle : Printer
                return <div className="preview-channel" key={channel.id}><span className={`preview-channel-icon ${channel.id}`}><Icon size={17} /></span><div><b>{channel.label}</b><small>{channel.short}</small></div><span className="preview-order">0{index + 1}</span></div>
              }) : <p className="preview-empty">媒体を選ぶと、作成する内容がここに表示されます。</p>}</div>
              <div className="preview-footer"><span>✦</span>それぞれの媒体に合わせた文章を作成</div>
            </aside>
          </div>
        </section>

        <section className="results-section" ref={resultsRef} aria-labelledby="results-title">
          <div className="results-heading"><div><div className="eyebrow"><span className="eyebrow-line" />YOUR PROMOTION SET</div><h2 id="results-title">販促セットができました</h2><p>文章は直接編集できます。お店の情報に合わせて整えてください。</p></div><span className="sample-warning"><Sparkles size={15} />サンプルは架空の店舗情報です</span></div>
          <div className="campaign-summary">
            <div className="campaign-icon"><Ticket size={23} /></div><div className="campaign-title"><span>CAMPAIGN NAME</span><input aria-label="キャンペーン名を編集" value={result.campaignName} onChange={(event) => editResult('campaignName', event.target.value)} /></div><button className="copy-button summary-copy" onClick={() => copyText('キャンペーン名', result.campaignName)}><Clipboard size={16} />コピー</button>
          </div>
          <details className="summary-details"><summary>企画内容を確認する <ChevronDown size={16} /></summary><pre>{result.summary}</pre></details>

          <div className="result-cards">
            {channels.filter((channel) => selected.includes(channel.id)).map((channel) => {
              const Icon = channel.id === 'instagram' ? Instagram : channel.id === 'line' ? MessageCircle : Printer
              const title = channel.id === 'flyer' ? 'チラシ原稿' : channel.label
              return <article className={`result-card result-${channel.id}`} key={channel.id}>
                <div className="result-card-head"><span className={`result-icon ${channel.id}`}><Icon size={19} /></span><div><h3>{title}</h3><p>{channel.id === 'instagram' ? '写真と一緒に、魅力を届ける投稿文' : channel.id === 'line' ? '大切なお客様に、短く伝える配信文' : 'ひと目で内容が伝わる紙面原稿'}</p></div><span className="result-channel-tag">{channel.id === 'instagram' ? 'VISUAL' : channel.id === 'line' ? 'MESSAGE' : 'PRINT'}</span></div>
                <textarea className="result-editor" aria-label={`${title}を編集`} value={result[channel.id]} onChange={(event) => editResult(channel.id, event.target.value)} rows={channel.id === 'instagram' ? 15 : channel.id === 'line' ? 13 : 16} />
                <div className="result-card-foot"><span>{result[channel.id].length}文字 · 編集できます</span><button className="copy-button" onClick={() => copyText(title, result[channel.id])}><Clipboard size={16} />文章をコピー</button></div>
              </article>
            })}
            {selected.length === 0 && <div className="no-results">作りたい媒体を選び、「販促セットを作る」を押してください。</div>}
          </div>
          <div className="review-reminder"><span><Check size={17} /></span><p><b>公開前に、内容をご確認ください。</b><br />料金・期間・予約先など、お店の情報と合っているか確認してからお使いください。</p></div>
        </section>

        <section className="closing-note"><div className="closing-paw"><PawPrint size={28} /></div><div><span>MADE FOR YOUR NEIGHBORHOOD</span><h2>いつものお客様にも、<br />これから出会うお客様にも。</h2></div><p>小さなお店の毎日に、<br />伝える時間を少しだけ。</p></section>
      </main>

      <footer className="footer"><a href="#top" className="brand footer-brand"><span className="brand-mark"><PawPrint size={18} /></span><span>salon letter<span className="brand-dot">.</span></span></a><span>ペットサロン向け販促文づくりデモ</span><span>DEMO · NOT A REAL BOOKING SERVICE</span></footer>
      <div className="sr-status" role="status" aria-live="polite">{notice}</div>
      {notice && <button className="toast" onClick={() => setNotice('')} aria-label="通知を閉じる"><Check size={17} />{notice}<span>×</span></button>}
    </div>
  )
}

export default App
