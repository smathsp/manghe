<script setup>
const preparationItems = [
  { name: '身份证正面', note: '清晰、完整、无反光' },
  { name: '身份证反面', note: '确保有效期信息可见' },
  { name: '本人正面大头照', note: '近期照片，五官无遮挡' },
  { name: '599 元年费', note: '提前准备对应费用' },
  { name: '一证十号的空位', note: '不了解可忽略；请按运营商实名规则确认' },
  { name: '中国移动 App', note: '提前安装并确认可以正常打开' },
]

const navItems = [
  { id: 'prepare', number: '01', label: '事先准备' },
  { id: 'reserve', number: '02', label: '预约实名' },
  { id: 'activate-card', number: '03', label: '开卡激活' },
  { id: 'traffic', number: '04', label: '购买流量' },
  { id: 'order', number: '05', label: '下单天火卡' },
]
</script>

<template>
  <main class="activation-page">
    <header class="activation-topbar">
      <div class="activation-shell activation-topbar-inner">
        <a href="/" class="activation-brand" aria-label="返回首页">
          <span class="activation-brand-mark">天</span>
          <span>
            <strong>天火卡</strong>
            <small>ACTIVATION GUIDE</small>
          </span>
        </a>
        <div class="activation-top-actions">
          <span class="guide-version">激活指南</span>
          <a href="/" class="activation-back">返回首页</a>
        </div>
      </div>
    </header>

    <section class="activation-hero">
      <div class="activation-shell activation-hero-grid">
        <div class="activation-hero-copy">
          <p class="activation-eyebrow"><span></span> TIANHUO SIM CARD</p>
          <h1>天火卡<br /><em>激活流程</em></h1>
          <p class="activation-lead">从资料准备到完成下单，按顺序操作。开始前请先完整阅读，并准备好全部所需资料。</p>
          <div class="activation-duration">
            <span class="duration-icon">30</span>
            <div><strong>预约后等待 30 分钟</strong><small>才可以进入开卡激活步骤</small></div>
          </div>
        </div>

        <div class="activation-overview" aria-label="流程概览">
          <span class="overview-label">完整流程</span>
          <ol>
            <li v-for="item in navItems" :key="item.id">
              <span>{{ item.number }}</span>
              <strong>{{ item.label }}</strong>
            </li>
          </ol>
        </div>
      </div>
    </section>

    <div class="activation-shell activation-layout">
      <aside class="activation-sidebar">
        <p>流程目录</p>
        <nav aria-label="激活流程目录">
          <a v-for="item in navItems" :key="item.id" :href="`#${item.id}`">
            <span>{{ item.number }}</span>{{ item.label }}
          </a>
        </nav>
        <div class="sidebar-help">
          <span>!</span>
          <p>遇到页面内容与指南不一致时，请暂停操作并联系负责你的工作人员。</p>
        </div>
      </aside>

      <div class="activation-content">
        <section id="prepare" class="guide-section guide-section-first">
          <header class="guide-section-header">
            <span class="guide-section-number">01</span>
            <div><p>BEFORE YOU START</p><h2>事先准备</h2></div>
          </header>

          <div class="guide-alert guide-alert-critical">
            <span aria-hidden="true">!</span>
            <div>
              <strong>请务必提前准备齐全</strong>
              <p>以下六项没有准备好的，请先不要继续后面的流程，以免错过办理时间。</p>
            </div>
          </div>

          <ol class="preparation-grid">
            <li v-for="(item, index) in preparationItems" :key="item.name">
              <span>{{ String(index + 1).padStart(2, '0') }}</span>
              <div><strong>{{ item.name }}</strong><small>{{ item.note }}</small></div>
              <i aria-hidden="true">✓</i>
            </li>
          </ol>

          <div class="privacy-note">
            <span aria-hidden="true">▣</span>
            <p><strong>隐私提醒</strong>以上资料不用提前发送给工作人员，请由本人妥善保管，仅在官方实名与开卡页面中按要求使用。</p>
          </div>
        </section>

        <section id="reserve" class="guide-section">
          <header class="guide-section-header">
            <span class="guide-section-number">02</span>
            <div><p>REAL-NAME RESERVATION</p><h2>预约实名</h2></div>
          </header>

          <div class="guide-step">
            <div class="guide-step-heading"><span>第 1 步</span><h3>记录工作人员发来的卡片信息</h3></div>
            <p>工作人员会发给你一张包含开卡信息的截图。请自己记录好下面三项内容：</p>
            <ul class="record-list">
              <li><span>01</span>天火手机号</li>
              <li><span>02</span>SIM 卡号</li>
              <li><span>03</span>个人手机号（自己正在使用的）</li>
            </ul>
            <figure class="guide-shot">
              <img src="/activation/figure-01.jpg" alt="工作人员发送的天火手机号、SIM卡号及二维码信息示例" loading="lazy" decoding="async" />
              <figcaption>截图中包含后续激活需要填写的信息</figcaption>
            </figure>
          </div>

          <div class="guide-step">
            <div class="guide-step-heading"><span>第 2 步</span><h3>微信扫码并完成开卡预约</h3></div>
            <p>使用微信扫描工作人员提供的二维码。进入页面后点击<strong>“第一步 · 开卡预约”</strong>，按照页面提示完成预约。</p>
            <div class="guide-shots-two">
              <figure class="guide-shot">
                <img src="/activation/figure-02.jpg" alt="微信扫码后的开卡激活首页" loading="lazy" decoding="async" />
                <figcaption>找到“第一步 · 开卡预约”入口</figcaption>
              </figure>
              <figure class="guide-shot">
                <img src="/activation/figure-03.jpg" alt="开卡预约信息填写步骤" loading="lazy" decoding="async" />
                <figcaption>按图示要求填写并提交</figcaption>
              </figure>
            </div>
            <p>提交后出现完成提示，点击<strong>“返回首页”</strong>，确认首页显示预约成功。</p>
            <figure class="guide-shot guide-shot-wide">
              <img src="/activation/figure-04.jpg" alt="开卡预约成功页面及返回首页提示" loading="lazy" decoding="async" />
              <figcaption>把预约成功截图发送给负责你的工作人员</figcaption>
            </figure>
            <div class="guide-alert guide-alert-time">
              <span aria-hidden="true">30</span>
              <div><strong>预约成功后等待 30 分钟</strong><p>未满 30 分钟请不要开始激活，否则可能无法正常办理。</p></div>
            </div>
          </div>
        </section>

        <section id="activate-card" class="guide-section">
          <header class="guide-section-header">
            <span class="guide-section-number">03</span>
            <div><p>CARD ACTIVATION</p><h2>开卡激活</h2></div>
          </header>

          <div class="guide-step">
            <div class="guide-step-heading"><span>第 1 步</span><h3>在浏览器中打开号卡激活</h3></div>
            <p>等待 30 分钟后点击<strong>“号卡激活”</strong>。点击右上角“…”菜单，选择在浏览器打开。页面需要填写的内容都可以在工作人员发送的截图中找到。</p>
            <figure class="guide-shot guide-shot-wide">
              <img src="/activation/figure-05.jpg" alt="号卡激活页面以及手机号和SIM卡号填写示例" loading="lazy" decoding="async" />
              <figcaption>对照工作人员截图逐项填写</figcaption>
            </figure>
          </div>

          <div class="guide-step">
            <div class="guide-step-heading"><span>第 2 步</span><h3>手写签名并保存业务受理单</h3></div>
            <p>完成手写签名后点击下方<strong>“确定”</strong>。下一步会显示业务受理单，请立即完整截图保存。</p>
            <div class="guide-alert guide-alert-critical">
              <span aria-hidden="true">!</span>
              <div><strong>业务受理单不可打码</strong><p>后续购买天火卡时必须上传完整业务受理单页面。</p></div>
            </div>
            <div class="guide-shots-two">
              <figure class="guide-shot">
                <img src="/activation/figure-06.jpg" alt="手写签名并提交协议的操作示例" loading="lazy" decoding="async" />
                <figcaption>完成手写签名后提交协议</figcaption>
              </figure>
              <figure class="guide-shot">
                <img src="/activation/figure-11.jpg" alt="需要完整保存的业务受理单页面" loading="lazy" decoding="async" />
                <figcaption>完整截图并妥善保存，不要裁切或打码</figcaption>
              </figure>
            </div>
          </div>

          <div class="guide-step">
            <div class="guide-step-heading"><span>第 3 步</span><h3>验证本人正在使用的手机号</h3></div>
            <p>按照图片提示填写<strong>自己当前正在使用的手机号</strong>，不是新办理的天火手机号。收到短信后截图保存，并发送给工作人员。</p>
            <figure class="guide-shot guide-shot-wide">
              <img src="/activation/figure-07.jpg" alt="本人常用手机号验证及激活成功短信示例" loading="lazy" decoding="async" />
              <figcaption>收到短信后截图发送给工作人员</figcaption>
            </figure>
          </div>
        </section>

        <section id="traffic" class="guide-section">
          <header class="guide-section-header">
            <span class="guide-section-number">04</span>
            <div><p>DATA PACKAGE</p><h2>购买流量</h2></div>
          </header>

          <div class="guide-step">
            <div class="guide-step-heading"><span>第 1 步</span><h3>进入鲲鹏网管小程序</h3></div>
            <p>再次扫描之前的二维码，在提示页面点击<strong>“流量查询”</strong>，进入“鲲鹏网管”小程序。</p>
            <div class="guide-shots-two">
              <figure class="guide-shot">
                <img src="/activation/figure-08.jpg" alt="用于再次扫码的天火卡信息二维码" loading="lazy" decoding="async" />
                <figcaption>点击“流量查询”</figcaption>
              </figure>
              <figure class="guide-shot">
                <img src="/activation/figure-09.jpg" alt="扫码后出现的流量查询页面" loading="lazy" decoding="async" />
                <figcaption>确认进入正确的小程序</figcaption>
              </figure>
            </div>
          </div>

          <div class="guide-step">
            <div class="guide-step-heading"><span>第 2 步</span><h3>购买 599 元年包流量</h3></div>
            <p>按照页面和图片要求购买年包流量。购买完成后保存成功页面截图，并发送给工作人员审核。</p>
            <figure class="guide-shot guide-shot-wide">
              <img src="/activation/figure-10.jpg" alt="鲲鹏网管小程序购买599元年包流量的步骤" loading="lazy" decoding="async" />
              <figcaption>购买成功后截图发送给工作人员</figcaption>
            </figure>
          </div>
        </section>

        <section id="order" class="guide-section guide-section-last">
          <header class="guide-section-header">
            <span class="guide-section-number">05</span>
            <div><p>PLACE YOUR ORDER</p><h2>下单天火卡链接</h2></div>
          </header>

          <div class="guide-step">
            <div class="guide-step-heading"><span>审核通过后</span><h3>打开工作人员发送的购买链接</h3></div>
            <p>审核通过后，工作人员会发送购买链接。点击后会跳转到<strong>“张导的店”</strong>小程序完成购买。</p>
            <div class="order-requirements">
              <div><span>必须上传</span><strong>完整业务受理单</strong><small>不可打码</small></div>
              <div><span>必须填写</span><strong>天火手机卡号</strong><small>仔细核对后提交</small></div>
            </div>
            <figure class="guide-shot guide-shot-wide">
              <img src="/activation/figure-12.jpg" alt="张导的店小程序天火卡购买页面" loading="lazy" decoding="async" />
              <figcaption>上传业务受理单并填写天火手机卡号</figcaption>
            </figure>
          </div>

          <div class="completion-card">
            <span aria-hidden="true">✓</span>
            <div><small>FLOW COMPLETE</small><h3>提交订单，完成全部流程</h3><p>提交前再次检查卡号和业务受理单，确认无误后完成购买。</p></div>
          </div>
        </section>
      </div>
    </div>

    <footer class="activation-footer">
      <div class="activation-shell"><p>天火卡激活指南</p><a href="#">回到顶部 ↑</a></div>
    </footer>
  </main>
</template>
