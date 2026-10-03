import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { ArrowDown, ArrowRight, Check, ChevronDown, Clipboard, Heart, Instagram, MessageCircle, PawPrint, RotateCcw, Sparkles, Store, Ticket, Megaphone, Printer } from 'lucide-react'
import { generateCopy, getFormErrors } from './lib/generate'
import { sampleForm } from './sample'
import { channels, type Channel, type CopySet, type SalonForm } from './types'

const blankForm: SalonForm = Object.fromEntries(Object.keys(sampleForm).map((key) => [key, ''])) as unknown as SalonForm

type ProductView = 'demo' | 'dashboard' | 'specs' | 'diagram'
const productViews: { id: ProductView; label: string }[] = [
  { id: 'demo', label: '動くデモ' },
  { id: 'dashboard', label: 'ダッシュボード' },
  { id: 'specs', label: '仕様書' },
  { id: 'diagram', label: '図解' },
]

function readProductView(): ProductView {
  const view = window.location.hash.replace(/^#\/?/, '').split('/')[0]
  return productViews.some((item) => item.id === view) ? view as ProductView : 'demo'
}

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
  const [activeView, setActiveView] = useState<ProductView>(readProductView)
  const [form, setForm] = useState<SalonForm>(sampleForm)
  const [selected, setSelected] = useState<Channel[]>(['instagram', 'line', 'flyer'])
  const [result, setResult] = useState<CopySet>(() => generateCopy(sampleForm))
  const [errors, setErrors] = useState<Partial<Record<keyof SalonForm, string>>>({})
  const [notice, setNotice] = useState('')
  const resultsRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const syncView = () => setActiveView(readProductView())
    window.addEventListener('hashchange', syncView)
    window.addEventListener('popstate', syncView)
    return () => {
      window.removeEventListener('hashchange', syncView)
      window.removeEventListener('popstate', syncView)
    }
  }, [])

  const selectView = (view: ProductView) => {
    if (readProductView() !== view) window.history.pushState(null, '', `#${view}`)
    setActiveView(view)
  }

  const handleViewKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const index = productViews.findIndex((item) => item.id === activeView)
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? productViews.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : productViews.length - 1)) % productViews.length
    const next = productViews[nextIndex].id
    selectView(next)
    window.requestAnimationFrame(() => document.getElementById(`product-tab-${next}`)?.focus())
  }

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
    <div className="app-shell product-shell">
      <header className="product-header">
        <a href="#demo" className="product-back" onClick={() => selectView('demo')}><ArrowDown size={15} /> 商品一覧へ</a>
        <a href="#demo" className="brand product-brand" aria-label="Salon Letter 商品ページ">
          <span className="brand-mark"><PawPrint size={21} strokeWidth={2.4} /></span>
          <span><small>ペットサロン販促文づくり</small>salon letter<span className="brand-dot">.</span></span>
        </a>
        <div className="product-price"><span>料金</span><strong>未定</strong></div>
      </header>
      <nav className="product-nav" aria-label="商品情報">
        <div role="tablist" aria-label="商品ページの画面" onKeyDown={handleViewKeyDown}>
          {productViews.map((view) => <button key={view.id} id={`product-tab-${view.id}`} type="button" role="tab" aria-selected={activeView === view.id} aria-controls={`product-panel-${view.id}`} tabIndex={activeView === view.id ? 0 : -1} className={activeView === view.id ? 'is-active' : ''} onClick={() => selectView(view.id)}>{view.label}</button>)}
        </div>
        <span className="product-nav-note">お店の情報から媒体別の販促原稿を作成</span>
      </nav>

      <main id="top">
        <div id="product-panel-demo" role="tabpanel" aria-labelledby="product-tab-demo" hidden={activeView !== 'demo'} className="product-panel demo-panel">
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
        </div>

        <section id="product-panel-dashboard" role="tabpanel" aria-labelledby="product-tab-dashboard" hidden={activeView !== 'dashboard'} className="product-panel product-dashboard">
          <div className="product-view-intro"><div className="eyebrow"><span className="eyebrow-line" />CAMPAIGN OVERVIEW · 架空サンプル</div><h1>販促セットを見渡す</h1><p>入力中・生成後の内容を媒体別に確認できます。サンプルは架空の店舗情報です。</p></div>
          <section className="dashboard-campaign"><div className="dashboard-campaign-icon"><Ticket size={22} /></div><div><span>CAMPAIGN NAME</span><h2>{result.campaignName}</h2></div></section>
          <section className="dashboard-summary"><div><span className="dashboard-section-kicker">PLAN SUMMARY</span><h2>企画概要</h2></div><pre>{result.summary}</pre></section>
          <div className="dashboard-copy-grid">
            {channels.map((channel) => {
              const label = channel.id === 'flyer' ? 'チラシ原稿' : channel.label
              return <article className={`dashboard-copy-card dashboard-${channel.id}`} key={channel.id}><div className="dashboard-copy-head"><div><span className="dashboard-section-kicker">{channel.id === 'instagram' ? 'SOCIAL POST' : channel.id === 'line' ? 'MESSAGE' : 'PRINT'}</span><h2>{label}</h2></div><span className="dashboard-live-tag">生成原稿</span></div><pre>{result[channel.id] || '動くデモで媒体を選択し、「販促セットを作る」を押すと原稿が表示されます。'}</pre></article>
            })}
          </div>
          <div className="dashboard-footnote"><Check size={16} /><p><strong>サンプルは架空データです。</strong>表示するのは入力とテンプレートから作られた文案です。配信数や反応率などの分析値はありません。</p></div>
        </section>

        <section id="product-panel-specs" role="tabpanel" aria-labelledby="product-tab-specs" hidden={activeView !== 'specs'} className="product-panel product-specs">
          <div className="product-view-intro"><div className="eyebrow"><span className="eyebrow-line" />PRODUCT DETAILS</div><h1>機能と利用範囲</h1><p>ペットサロン向け販促文づくりデモの入力、出力、データの扱いをまとめています。</p></div>
          <section className="spec-card"><h2>入力項目</h2><div className="spec-table-wrap"><table className="spec-table"><thead><tr><th>区分</th><th>項目</th><th>必須・任意</th><th>用途</th></tr></thead><tbody>
            <tr><td>お店</td><td>店舗名・エリア・主なサービス・特徴・届けたいお客様</td><td>必須</td><td>店舗紹介や対象者の表現に使用</td></tr>
            <tr><td>お店</td><td>予約・問い合わせ先</td><td>任意</td><td>未入力なら予約方法の入力を促す</td></tr>
            <tr><td>お店</td><td>雰囲気・文体</td><td>任意</td><td>文章のトーンに使用</td></tr>
            <tr><td>企画</td><td>目的・サービス／特典</td><td>必須</td><td>キャンペーン名と原稿の中心内容</td></tr>
            <tr><td>企画</td><td>料金・期間・対象条件・追加情報</td><td>任意</td><td>入力された事実だけを原稿へ反映</td></tr>
            <tr><td>企画</td><td>発信媒体（Instagram・LINE・チラシ）</td><td>1媒体以上必須</td><td>生成結果カードの選択</td></tr>
          </tbody></table></div></section>
          <div className="spec-card-grid"><section className="spec-card"><h2>媒体別の出力内容</h2><ul><li><strong>Instagram：</strong>導入、サービス紹介、条件、予約案内、ハッシュタグ</li><li><strong>LINE：</strong>短い挨拶、特典・期間、予約案内</li><li><strong>チラシ：</strong>見出し、特典、店舗紹介、条件、予約先</li></ul></section>
            <section className="spec-card"><h2>生成・編集</h2><p>ブラウザー内のルールベースのテンプレートでキャンペーン名・概要・媒体別原稿を作成します。生成後の文章は画面上で編集でき、カード単位でコピーできます。AI APIは使用しません。</p></section></div>
          <section className="spec-card"><h2>データの扱いと対象外</h2><p>入力内容と文案はブラウザー内だけで処理します。サーバーへの送信、永続保存、SNS投稿、LINE配信、予約受付は行いません。ページを閉じると入力・編集内容は保持されません。利用前に店舗側で料金・期間・条件・予約先を確認してください。</p></section>
          <p className="product-price-note">商品料金：未定（提供条件を確認中）</p>
        </section>

        <section id="product-panel-diagram" role="tabpanel" aria-labelledby="product-tab-diagram" hidden={activeView !== 'diagram'} className="product-panel product-diagram">
          <div className="product-view-intro"><div className="eyebrow"><span className="eyebrow-line" />HOW IT WORKS</div><h1>入力から、使える原稿まで</h1><p>お店の情報と企画条件から、各媒体に合わせた下書きを作る流れです。</p></div>
          <div className="promotion-flow" aria-label="店舗情報と企画条件を入力、必須項目確認、媒体別原稿生成、編集とコピー、店舗側で確認して利用する流れ">
            {[
              { n: '01', icon: <Store size={23} />, title: '店舗情報・企画条件を入力', text: 'お店の特徴、目的、特典などを入力' },
              { n: '02', icon: <Check size={23} />, title: '必須項目を確認', text: '店舗情報と企画に必要な項目を確認' },
              { n: '03', icon: <Megaphone size={23} />, title: '媒体別原稿を生成', text: 'Instagram・LINE・チラシ用に展開' },
              { n: '04', icon: <Clipboard size={23} />, title: '編集・コピー', text: '文章を整え、必要な原稿をコピー' },
              { n: '05', icon: <Heart size={23} />, title: '店舗側で確認して利用', text: '事実や条件を確認して手動で活用' },
            ].map((step, index) => <div className="promotion-flow-item" key={step.n}><article><div className="promotion-flow-top"><span>{step.n}</span><b>{step.icon}</b></div><h2>{step.title}</h2><p>{step.text}</p></article>{index < 4 && <span className="promotion-flow-arrow" aria-hidden="true"><ArrowRight size={19} /></span>}</div>)}
          </div>
          <div className="flow-output"><span className="flow-output-mark"><Sparkles size={19} /></span><div><strong>3種類の編集可能な下書き</strong><p>入力内容に基づく原稿を表示します。自動投稿・自動配信は行いません。</p></div><div className="flow-channel-tags"><span>Instagram</span><span>LINE</span><span>チラシ</span></div></div>
        </section>
      </main>

      <footer className="footer product-footer"><a href="#demo" className="brand footer-brand" onClick={() => selectView('demo')}><span className="brand-mark"><PawPrint size={18} /></span><span>salon letter<span className="brand-dot">.</span></span></a><span>ペットサロン向け販促文づくりデモ</span><span>文案は確認・編集してからご利用ください</span></footer>
      <div className="sr-status" role="status" aria-live="polite">{notice}</div>
      {notice && <button className="toast" onClick={() => setNotice('')} aria-label="通知を閉じる"><Check size={17} />{notice}<span>×</span></button>}
    </div>
  )
}

export default App
