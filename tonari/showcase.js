// The presentation is always a phone. The guided animation uses the same real screens.
let demoRunning=false,demoTimers=[],demoStep=0,lastScreen='';
const demoCaptions=['日常の投稿から、交流が始まります。','シニアの画面：若い人の話を聞きたい。','シニアの画面：今日は日常を話したい。','若者の画面：今日はちょっと愚痴りたい。','若者の画面：おばあちゃんと話したい。','気分に合った、お話し相手の例です。','友だちとの会話を、ゆっくり続けます。','名前を知らない誰かから、お便りが届きます。','あなたの言葉も、別の世代へ。','友だちをビデオのおしゃべりに誘います。','顔を合わせて、笑顔も分けあう時間。','通話のあとも、トークを続けられます。','画面を直接タップして体験できます。'];
const originalModal=modal;
modal=function(title,body){originalModal(title,body);positionDialog()};
function positionDialog(){if(!dialog.open)return;const box=document.querySelector('.workspace').getBoundingClientRect();dialog.style.left=(box.left+16)+'px';dialog.style.top=(box.top+30)+'px';dialog.style.width=(box.width-32)+'px';dialog.style.maxHeight=(box.height-60)+'px';dialog.style.margin='0';}
window.addEventListener('resize',positionDialog);
render=function(){
 document.body.dataset.persona=state.persona;document.body.classList.toggle('demo-running',demoRunning);
 const screen=state.page+state.persona,animate=screen!==lastScreen;lastScreen=screen;
 const featureCopy=[['別の世代へ、お便りを流す','名前を知らない誰かと、言葉でつながる。'],['日常を分けあう','写真やひとことから、誰かの毎日を知る。'],['今の気分で、話し相手を探す','聞いてほしい日も、誰かの話を聞きたい日も。'],['友だちと、お話の続きを','文字と声で、ゆっくり仲良く。'],['顔を合わせて、話してみる','お互いの都合が合うときに、ビデオで。']];
 document.getElementById('app').innerHTML=`<div class="layout"><aside class="desktop-note"><a class="desktop-brand" href="#/forum"><img src="assets/grandpa.png" alt="">となり便り</a><h2 class="desktop-title">ちがう世代の、<br>いつものとなりに。</h2><div class="desktop-companions"><img src="assets/${state.persona==='senior'?'grandpa':'young-man'}.png" alt="いつもの小人"><p>今日のこと、少し話しませんか。</p></div><div class="demo-features">${navItems.map(([id,ic],i)=>`<a class="demo-feature ${state.page===id?'active':''}" href="#/${id}">${icon(ic)}<span><strong>${featureCopy[i][0]}</strong><small>${featureCopy[i][1]}</small></span></a>`).join('')}</div><div class="demo-controls"><button class="primary" data-action="play-demo">${icon(demoRunning?'close':'play')}${demoRunning?'デモを止める':'自動デモを再生'}</button><small>約45秒 / 操作もできます</small></div><div class="demo-progress"><span style="width:${demoRunning?(demoStep/12)*100:0}%"></span></div><p class="demo-caption">${demoRunning?demoCaptions[demoStep]:'右のスマートフォンで、機能を体験できます。<br>上のスイッチで、シニアと若者の画面を切り替え。'}</p></aside><div class="workspace" data-page="${state.page}"><header class="topbar"><a class="mobile-brand" href="#/forum"><img src="assets/grandpa.png" alt="">となり便り</a><div class="persona-switch" role="group" aria-label="表示する立場"><button data-action="persona" data-value="senior" aria-pressed="${state.persona==='senior'}">シニア</button><button data-action="persona" data-value="young" aria-pressed="${state.persona==='young'}">若者</button></div></header><main id="main" tabindex="-1" class="${animate?'page-enter':''}"><button class="demo-mobile-toggle" data-action="play-demo">${icon(demoRunning?'close':'play')}${demoRunning?'デモを止める':'自動デモを再生'}</button>${({forum,mood:moodPage,bottles:bottlePage,friends:friendsPage,video:videoPage}[state.page]||forum)()}</main>${nav(true)}</div></div>`;
 document.title=`${navItems.find(n=>n[0]===state.page)?.[2]||'暮らしの広場'} | となり便り`;
 if(dialog.open)positionDialog();
};
function updateDemoControls(){document.body.classList.toggle('demo-running',demoRunning);document.querySelectorAll('[data-action="play-demo"]').forEach(b=>{b.innerHTML=icon(demoRunning?'close':'play')+(demoRunning?'デモを止める':'自動デモを再生')});const caption=document.querySelector('.demo-caption');if(caption)caption.textContent=demoRunning?demoCaptions[demoStep]:'画面を直接タップして体験できます。';}
function stopDemo(){demoTimers.forEach(clearTimeout);demoTimers=[];demoRunning=false;updateDemoControls();}
function demoView(page,persona,step,extra={}){if(dialog.open)closeModal();Object.assign(state,{page,persona},extra);demoStep=step;render();}
function startDemo(){stopDemo();demoRunning=true;state.filter='すべて';state.messages={};demoView('forum','young',0);const steps=[
 [3500,()=>demoView('mood','senior',1,{mood:0})],
 [7000,()=>demoView('mood','senior',2,{mood:1})],
 [10000,()=>demoView('mood','young',3,{mood:0})],
 [13500,()=>demoView('mood','young',4,{mood:1})],
 [17000,()=>{demoStep=5;render();match()}],
 [21000,()=>demoView('friends','young',6,{friend:'kazuko'})],
 [25500,()=>{demoView('bottles','young',7);pickLetter()}],
 [30000,()=>{demoView('bottles','young',8);writeBottle('今日、誰かに聞いてほしかったこと');const input=document.querySelector('#bottle-text');if(input)input.value='今日は少し疲れてしまったけれど、誰かのやさしい言葉で、ほっとしました。あなたの一日は、どうでしたか。'}],
 [34000,()=>{state.video.status='ready';demoView('video','young',9)}],
 [37500,()=>{demoStep=10;connectVideo()}],
 [42000,()=>{demoStep=11;endVideo()}],
 [45000,()=>{demoView('forum','young',12);stopDemo()}]
 ];demoTimers=steps.map(([delay,fn])=>setTimeout(()=>{if(demoRunning)fn()},delay));}
document.addEventListener('click',e=>{const action=e.target.closest('[data-action]')?.dataset.action;if(action==='play-demo'){e.preventDefault();demoRunning?stopDemo():startDemo();return;}if(e.isTrusted&&demoRunning)stopDemo();const link=e.target.closest('a[href^="#/"]');if(link){const page=link.getAttribute('href').slice(2);if(location.hash===`#/${page}`&&state.page!==page){state.page=page;render();}}},true);
document.addEventListener('keydown',e=>{if(e.isTrusted&&demoRunning)stopDemo()},true);
render();
