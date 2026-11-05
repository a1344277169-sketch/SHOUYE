// Six fictional personas; each mood has its own cross-generation match pool.
Object.assign(people, {
  chiyo: {name:'千代', age:'60代', place:'福岡', asset:'grandma', role:'senior', interest:'お菓子作り・季節の花', bio:'元花屋さん。小さな喜びを一緒に見つけるのが好き。'},
  ren: {name:'蓮', age:'20代', place:'京都', asset:'young-man', role:'young', interest:'音楽・カメラ・スマホ', bio:'大学院生。新しいことを教えるのも、昔のお話を聞くのも好き。'}
});
Object.assign(people.kazuko,{bio:'庭しごとの合間に、相手の話をゆっくり聞くのが好き。'});
Object.assign(people.shigeru,{bio:'元会社員。仕事の失敗も旅の思い出も、気軽に話せる先輩。'});
Object.assign(people.misaki,{bio:'働き始めたばかり。何でもない日の話を、気負わず分けあいたい。'});
Object.assign(people.haru,{bio:'料理と一人旅が好き。知らない土地の暮らしに興味がある。'});
posts.push(
  {id:5,who:'chiyo',category:'ごはん',title:'りんごのケーキが焼けました。',body:'花屋をしていたころ、お客さんに教わったレシピです。今日は少しだけシナモンを多めに。みなさんは、どんなおやつが好きですか。',time:'今日',tags:['手作りのおやつ','季節の楽しみ'],comments:[]},
  {id:6,who:'ren',category:'暮らし',title:'研究の合間に、鴨川までひと歩き。',body:'画面とにらめっこの一日だったので、少しだけ外へ。川沿いのベンチで好きな音楽を聴いたら、気持ちが切り替わりました。みなさんの気分転換も知りたいです。',time:'今日',tags:['京都の日常','気分転換'],comments:[]}
);
letters.young.push({who:'chiyo',topic:'季節のお便り',text:'花屋をしていたころ、お客さんから「この花を見ると母を思い出す」と聞きました。\n\nあなたにも、誰かを思い出す花や香りがありますか。よかったら、そのお話を聞かせてください。'});
letters.senior.push({who:'ren',topic:'違う世代に聞きたいこと',text:'研究で行き詰まって、少し遠回りして帰った日です。\n\nみなさんは若いころ、迷ったときにどんな場所でひと休みしていましたか。昔と今の気分転換を、お話ししてみたいです。'});

const matchPools = {
  young: [
    [
      ['shigeru','仕事でうまくいかない日、私にもありました。今日は助言より、まずお話を聞きますね。','仕事や日々の愚痴を、評価せず聞いてくれる先輩。'],
      ['kazuko','今日は大変だったんですね。温かいお茶でも飲みながら、まとまらない話のままで大丈夫ですよ。','急がず、相手のペースで話を聞くのが好き。'],
      ['chiyo','ため息が出る日もありますよね。よかったら、今日あったことを少しだけ聞かせてください。','日常の疲れを、やわらかく受け止めてくれる人。']
    ],
    [
      ['kazuko','ちょうど庭しごとを終えたところです。今日のこと、一緒にのんびり話しましょう。','お茶を飲むような、ゆっくりした会話が得意。'],
      ['chiyo','今日はお菓子を焼いたんですよ。あなたの好きなおやつは何ですか？','お菓子や花の話から、気軽におしゃべりできる人。']
    ],
    [
      ['chiyo','それはうれしいですね！ どんな小さなことでも、一緒に喜びたいです。','毎日の小さな喜びを見つけて、分けあうのが好き。'],
      ['kazuko','よかったですね。あなたがうれしかった瞬間を、ゆっくり聞かせてください。','日常のうれしい出来事を、丁寧に聞いてくれる人。'],
      ['shigeru','いい一日だったんですね。どんなことがあったのか、ぜひ聞かせてください。','若い世代の挑戦や「できた」を応援したい先輩。']
    ],
    [
      ['shigeru','初めての仕事で失敗した日のこと、今も覚えています。そんな昔話でもよければ。','仕事や人生の経験、昔の映画の話を聞いてみたいときに。'],
      ['chiyo','花屋をしていたころ、いろんなお客さんに出会いました。忘れられないお話があるんです。','花屋で出会った人たちや、暮らしの思い出を持つ先輩。'],
      ['kazuko','昔の長野の暮らしと、今の暮らし。変わったことも、変わらないこともありますね。','地方での生活や、世代による暮らしの違いを知りたいときに。']
    ]
  ],
  senior: [
    [
      ['misaki','今日は仕事で少し落ち込んでいて。答えを出さずに、ちょっと聞いてもらえたらうれしいです。','仕事の気持ちを、人生の先輩に聞いてほしい若者。'],
      ['ren','研究が思うように進まない日で。誰かに話したら、少し整理できる気がして。','研究や将来の迷いを、違う世代の人に話してみたい学生。'],
      ['haru','一人暮らしを始めて、たまに誰かと食卓の話がしたくなるんです。','一人暮らしの出来事を、気軽に分けあいたい若者。']
    ],
    [
      ['haru','地方の毎日って、どんな感じなんでしょう。今日のお散歩やごはんの話を聞きたいです。','地方の暮らしや料理に興味があり、話を聞いてみたい人。'],
      ['misaki','今日はどんな一日でしたか？ お花や庭のこと、何でも聞いてみたいです。','何でもない日常の話を、ゆっくり聞くのが好き。'],
      ['ren','写真に撮りたくなる風景、ありましたか？ いつもの景色の話を聞いてみたいです。','日常の風景や、身近な発見に興味がある学生。']
    ],
    [
      ['ren','スマホのことも、最近の音楽のことも。わかることなら、ゆっくり一緒に考えます。','スマホや新しいことを、わかりやすく話すのが好き。'],
      ['haru','最近よく使っているアプリや、旅先の探し方ならお話しできますよ。','旅行や日常のアプリについて、若者の使い方を聞ける人。'],
      ['misaki','若い人の暮らしで、気になることはありますか？ 私の毎日のことならお話しできます。','今の仕事や街での暮らしについて、気軽に質問できる若者。']
    ],
    [
      ['misaki','お茶の時間、いいですね。話題を決めずに、今日のことから話しませんか。','話すのも聞くのも、気楽に楽しみたい人。'],
      ['haru','コーヒーをいれたところです。好きなごはんや、次に行きたい場所の話でも。','食べ物や旅の話から、のんびり会話したい若者。'],
      ['ren','音楽を止めて、少しひと休みしていました。ゆっくりおしゃべりしませんか。','趣味やいつもの毎日を、違う世代と分けあいたい人。']
    ]
  ]
};
const matchTurns = {};
state.pendingMatch = null;
match = function() {
  const key = `${state.persona}:${state.mood}`;
  const pool = matchPools[state.persona][state.mood];
  const entry = pool[(matchTurns[key] || 0) % pool.length];
  matchTurns[key] = (matchTurns[key] || 0) + 1;
  const [who, line, reason] = entry;
  const p = people[who];
  state.pendingMatch = {who, line, mood: moods[state.persona][state.mood][1], persona:state.persona};
  modal('こんなお相手はいかがですか', `<p>「${moods[state.persona][state.mood][1]}」の気分に合うお相手。</p><div class="match-result">${avatar(who,'large')}<div><strong>${p.name}さん / ${p.age}</strong><p>${p.place} · ${p.interest}</p></div></div><p>${p.bio}</p><div class="letter" style="font-size:15px">${line}</div><p class="match-reason">${icon('heart')}<span>${reason}</span></p><p>希望する方法：${state.mode}</p><button class="primary wide" data-action="invite" data-id="${who}">おしゃべりに誘う</button><button class="text-button match-another" data-action="match">${icon('friends')}ほかのお相手も見る</button>`);
};
const personaMessages = {
  kazuko:['美咲さん、こんにちは。今日はどんな一日でしたか？ 私は庭の花に水をあげていました。','お疲れさまでした。急がなくていいから、ゆっくり聞かせてください。'],
  shigeru:['今日は散歩の途中で、昔よく通った喫茶店を見つけました。','若いころの私も、失敗ばかりでした。よかったら、どんなことがあったか聞かせてください。'],
  chiyo:['今日はりんごのケーキを焼きました。甘いものは、お好きですか？','元花屋なので、季節の花を見るとつい足が止まります。あなたの街には、どんな花が咲いていますか？'],
  misaki:['和子さん、こんにちは。昨日のお話を思い出して、今日は少し深呼吸してみました。','お昼休みに小さな花を見つけました。また今日のこと、聞いてもらえたらうれしいです。'],
  haru:['こんにちは！ 今日は久しぶりに自炊してみました。','今度、一人で旅行してみたいです。地元の好きな場所、よかったら教えてください。'],
  ren:['こんにちは。研究の合間に、鴨川を少し歩いてきました。','最近の音楽やスマホのこと、気になることがあったら聞いてください。昔の暮らしのお話も聞いてみたいです。']
};
getMessages = function(id) {
  const key = chatKey(id);
  if (!state.messages[key]) {
    const lines = personaMessages[id];
    state.messages[key] = [
      {from:id,text:lines[0],time:'14:02'},
      {from:self(),text:state.persona==='senior'?'こんにちは。今日も、ゆっくりお話ししましょう。':'こんにちは！ いつもと違う一日のお話、聞けてうれしいです。',time:'14:05'},
      {from:id,text:lines[1],time:'14:08'}
    ];
  }
  return state.messages[key];
};
document.addEventListener('click',e=>{
  if(e.target.closest('[data-action]')?.dataset.action!=='samplechat')return;
  const current=state.pendingMatch;
  if(!current || current.persona!==state.persona || current.who!==e.target.closest('[data-action]').dataset.id)return;
  state.messages[chatKey(current.who)]=[
    {from:self(),text:`「${current.mood}」の気分で、お誘いしてみました。`,time:'たった今'},
    {from:current.who,text:current.line,time:'たった今'}
  ];
},true);
