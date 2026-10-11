/* WATJAI — configure Supabase in the block below before publishing. */
const SUPABASE_URL = "https://dzkbopalqgzcmqnlhdev.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Yp4en8TFT1ed76kCutwVQQ_LnyjDZ7r";

const $ = (id) => document.getElementById(id);
const views = ["homeView","createView","playView","resultView","manageView","shareView"];
let db = null, currentUser = null, activeQuiz = null, questionIndex = 0, answers = [];
let lastScore = null, lastQuizId = null, lastSlug = null;
let toastTimer = null;

function configured(){return SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("PASTE_") && SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_") || (SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("PASTE_") && SUPABASE_PUBLISHABLE_KEY.length > 30 && !SUPABASE_PUBLISHABLE_KEY.includes("PASTE_"));}
function toast(message){const el=$("toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),3000);}
function showView(id){views.forEach(v=>$(v).classList.toggle("hidden",v!==id));window.scrollTo({top:0,behavior:"smooth"});}
function safeText(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
async function init(){
  if(!configured() || !window.supabase){$("connectionBadge").textContent="ยังไม่ตั้งค่า Supabase";return;}
  try{
    db=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
    let {data:{session}}=await db.auth.getSession();
    if(!session){const res=await db.auth.signInAnonymously();if(res.error)throw res.error;session=res.data.session;}
    currentUser=session?.user??null;
    $("connectionBadge").innerHTML="<i></i> เชื่อมต่อแล้ว";$("connectionBadge").classList.add("connected");
    const slug=new URLSearchParams(location.search).get("q");
    if(slug) await loadQuiz(slug);
  }catch(err){console.error(err);$("connectionBadge").textContent="เชื่อมต่อไม่สำเร็จ";toast("เชื่อม Supabase ไม่สำเร็จ ตรวจสอบการตั้งค่าและ Anonymous Sign-ins");}
}
function needDb(){if(!db||!currentUser){toast("ยังไม่ได้เชื่อม Supabase — ทำตาม README ก่อนนะ");return false;}return true;}

$("goCreate").onclick=()=>{if(!needDb())return;resetBuilder();showView("createView");};
$("goFind").onclick=()=>{$("linkLookup").classList.toggle("hidden");$("quizLinkInput").focus();};
$("backHome").onclick=$("cancelCreate").onclick=()=>showView("homeView");
$("backFromManage").onclick=()=>showView("homeView");
$("exitPlay").onclick=()=>showView("homeView");
$("retryQuiz").onclick=()=>{if(activeQuiz)startQuiz(activeQuiz);};
$("addQuestion").onclick=()=>addQuestionCard();
$("openQuizBtn").onclick=()=>{const raw=$("quizLinkInput").value.trim();if(!raw){toast("วางลิงก์หรือรหัสก่อน");return;}let slug=raw;try{const u=new URL(raw);slug=u.searchParams.get("q")||raw.split("/").pop();}catch{}loadQuiz(slug);};
$("nextQuestion").onclick=()=>{if(answers[questionIndex]===undefined){toast("เลือกคำตอบก่อนน้า");return;}if(questionIndex<activeQuiz.questions.length-1){questionIndex++;renderQuestion();}else finishQuiz();};
$("saveResult").onclick=saveScore;
$("shareResult").onclick=shareActiveQuiz;
$("copyShareLink").onclick=async()=>{try{await navigator.clipboard.writeText($("shareLink").value);toast("คัดลอกลิงก์แล้ว!");}catch{$("shareLink").select();document.execCommand("copy");toast("คัดลอกลิงก์แล้ว!");}};
$("playOwnQuiz").onclick=()=>{if(activeQuiz)startQuiz(activeQuiz);};
$("manageOwnQuiz").onclick=()=>openManage();

function resetBuilder(){ $("quizTitle").value="";$("quizDescription").value="";$("questionBuilder").innerHTML="";for(let i=0;i<20;i++)addQuestionCard(); }
function addQuestionCard(data={}){
  const root=$("questionBuilder");if(root.children.length>=20){toast("ได้สูงสุด 20 ข้อจ้า");return;}
  const n=root.children.length+1, card=document.createElement("article");card.className="question-card";
  card.innerHTML=`<div class="question-card-head"><b>ข้อที่ ${n}</b><button type="button" class="remove-question">ลบข้อ</button></div>
  <label class="field-label">คำถาม</label><input class="q-text" maxlength="240" required placeholder="พิมพ์คำถามที่นี่..." value="${safeText(data.question||"")}">
  <div class="options-grid">${[0,1,2,3].map(i=>`<label class="option-field"><input type="radio" name="correct-${n}" value="${i}" ${Number(data.correctIndex||0)===i?"checked":""} aria-label="เลือกเป็นคำตอบที่ถูกต้อง"><input class="opt-text" maxlength="120" required placeholder="ตัวเลือก ${String.fromCharCode(65+i)}" value="${safeText(data.options?.[i]||"")}"></label>`).join("")}</div>
  <p class="fine-print">วงกลมด้านหน้าตัวเลือก = คำตอบที่ถูกต้อง</p>`;
  card.querySelector(".remove-question").onclick=()=>{card.remove();renumberCards();};
  root.appendChild(card);renumberCards();
}
function renumberCards(){[...$("questionBuilder").children].forEach((card,i)=>{card.querySelector(".question-card-head b").textContent=`ข้อที่ ${i+1}`;card.querySelectorAll('input[type="radio"]').forEach(r=>r.name=`correct-${i+1}`);});$("questionCount").textContent=$("questionBuilder").children.length;}
function readBuilder(){
  const cards=[...$("questionBuilder").children];
  if(cards.length<1||cards.length>20)throw Error("ต้องมีคำถาม 1–20 ข้อ");
  return cards.map((card,i)=>{
    const question=card.querySelector(".q-text").value.trim();
    const options=[...card.querySelectorAll(".opt-text")].map(x=>x.value.trim());
    const correctIndex=Number(card.querySelector('input[type="radio"]:checked')?.value);
    if(!question||options.some(x=>!x))throw Error(`กรอกคำถามและตัวเลือกให้ครบในข้อ ${i+1}`);
    if(new Set(options).size!==4)throw Error(`ตัวเลือกในข้อ ${i+1} ต้องไม่ซ้ำกัน`);
    return {question,options,correctIndex};
  });
}
$("quizForm").addEventListener("submit",async e=>{
  e.preventDefault();if(!needDb())return;
  const title=$("quizTitle").value.trim();if(!title){toast("ใส่ชื่อแบบทดสอบก่อน");return;}
  let questions;try{questions=readBuilder();}catch(err){toast(err.message);return;}
  const btn=$("publishBtn");btn.disabled=true;btn.textContent="กำลังสร้าง...";
  try{
    const slug=makeSlug();
    const {data,error}=await db.from("quizzes").insert({owner_id:currentUser.id,title,description:$("quizDescription").value.trim(),questions,slug,published:true}).select("id,slug,title,description,questions").single();
    if(error)throw error;
    activeQuiz=data;lastQuizId=data.id;lastSlug=data.slug;
    $("shareLink").value=makeQuizUrl(data.slug);$("shareStatus").textContent=`สร้าง ${questions.length} ข้อเรียบร้อย`;
    showView("shareView");
  }catch(err){console.error(err);toast("สร้างไม่สำเร็จ: "+(err.message||"ตรวจสอบ SQL และนโยบายฐานข้อมูล"));}finally{btn.disabled=false;btn.textContent="สร้างและรับลิงก์ ↗";}
});
function makeSlug(){return Math.random().toString(36).slice(2,7)+Date.now().toString(36).slice(-5);}
function makeQuizUrl(slug){const u=new URL(location.href);u.search="";u.hash="";u.searchParams.set("q",slug);return u.toString();}
async function loadQuiz(slug){
  if(!needDb())return;
  const clean=String(slug||"").trim().replace(/[^a-zA-Z0-9_-]/g,"").slice(0,40);if(!clean){toast("ลิงก์หรือรหัสไม่ถูกต้อง");return;}
  try{
    const {data,error}=await db.from("quizzes").select("id,slug,title,description,questions").eq("slug",clean).eq("published",true).maybeSingle();
    if(error)throw error;if(!data)throw Error("ไม่พบแบบทดสอบนี้ อาจถูกลบหรือยังไม่ได้เผยแพร่");
    activeQuiz=data;lastQuizId=data.id;lastSlug=data.slug;startQuiz(data);
  }catch(err){console.error(err);toast(err.message||"เปิดแบบทดสอบไม่สำเร็จ");}
}
function startQuiz(quiz){activeQuiz=quiz;questionIndex=0;answers=Array(quiz.questions.length).fill(undefined);showView("playView");$("playTitle").textContent=quiz.title;$("playDescription").textContent=quiz.description||"ตอบให้ครบ แล้วมาดูกันว่าคุณได้กี่คะแนน";$("playTag").textContent=`${quiz.questions.length} ข้อวัดใจ`;renderQuestion();}
function renderQuestion(){
  const q=activeQuiz.questions[questionIndex],total=activeQuiz.questions.length,pct=Math.round(questionIndex/total*100);
  $("progressLabel").textContent=`ข้อ ${questionIndex+1} / ${total}`;$("progressPercent").textContent=`${pct}%`;$("progressBar").style.width=`${pct}%`;
  $("questionArea").innerHTML=`<h3 class="question-prompt">${safeText(q.question)}</h3><div class="answer-list">${q.options.map((opt,i)=>`<button class="answer-option ${answers[questionIndex]===i?"selected":""}" data-index="${i}"><span class="option-letter">${String.fromCharCode(65+i)}</span><span>${safeText(opt)}</span></button>`).join("")}</div>`;
  $("questionArea").querySelectorAll(".answer-option").forEach(btn=>btn.onclick=()=>{answers[questionIndex]=Number(btn.dataset.index);renderQuestion();});
  $("nextQuestion").disabled=answers[questionIndex]===undefined;$("nextQuestion").textContent=questionIndex===total-1?"ดูผลคะแนน ✨":"คำถามถัดไป →";
}
function finishQuiz(){
  const total=activeQuiz.questions.length;let score=0;
  activeQuiz.questions.forEach((q,i)=>{if(Number(q.correctIndex)===answers[i])score++;});
  lastScore={score,total};$("resultScore").textContent=`${score}/${total}`;
  const pct=Math.round(score/total*100);$("resultHeading").textContent=pct>=80?"รู้จักกันดีมาก! 🎉":pct>=50?"รู้จักกันอยู่เหมือนกันนะ 💜":"ยังมีอะไรให้เรียนรู้อีกเยอะเลย ✨";
  $("resultMessage").textContent=`คุณตอบถูก ${pct}% ของแบบทดสอบนี้`; $("playerName").value="";$("saveStatus").textContent="";showView("resultView");
}
async function saveScore(){
  if(!needDb()||!lastScore||!activeQuiz)return;
  const btn=$("saveResult");btn.disabled=true;btn.textContent="กำลังบันทึก...";
  try{
    const name=$("playerName").value.trim().slice(0,32)||"ไม่ระบุชื่อ";
    const {error}=await db.from("quiz_scores").insert({quiz_id:activeQuiz.id,player_name:name,score:lastScore.score,total:lastScore.total});
    if(error)throw error;$("saveStatus").textContent="บันทึกคะแนนเรียบร้อยแล้ว 💜";toast("บันทึกคะแนนแล้ว!");
  }catch(err){console.error(err);$("saveStatus").textContent="บันทึกไม่ได้: "+(err.message||"ตรวจสอบการตั้งค่า Supabase");}
  finally{btn.disabled=false;btn.textContent="บันทึกคะแนน";}
}
async function shareActiveQuiz(){if(!activeQuiz)return;const url=makeQuizUrl(activeQuiz.slug);try{await navigator.clipboard.writeText(url);toast("คัดลอกลิงก์แบบทดสอบแล้ว!");}catch{$("shareLink").value=url;showView("shareView");}}
async function openManage(){
  if(!needDb())return;showView("manageView");$("myQuizzes").innerHTML="<p class='muted'>กำลังโหลด...</p>";$("scoresArea").classList.add("hidden");
  try{
    const {data,error}=await db.from("quizzes").select("id,slug,title,description,created_at,questions").eq("owner_id",currentUser.id).order("created_at",{ascending:false});
    if(error)throw error;
    if(!data.length){$("myQuizzes").innerHTML="<p class='muted'>ยังไม่มีแบบทดสอบที่สร้างในเบราว์เซอร์นี้</p>";return;}
    $("myQuizzes").innerHTML=data.map(q=>`<article class="manage-item"><div><h3>${safeText(q.title)}</h3><p>${q.questions.length} ข้อ · ${safeText(makeQuizUrl(q.slug))}</p></div><div class="manage-buttons"><button class="mini-btn" data-share="${safeText(q.slug)}">คัดลอกลิงก์</button><button class="mini-btn" data-scores="${safeText(q.id)}" data-title="${safeText(q.title)}">ดูคะแนน</button></div></article>`).join("");
    $("myQuizzes").querySelectorAll("[data-share]").forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(makeQuizUrl(b.dataset.share));toast("คัดลอกลิงก์แล้ว");}catch{toast(makeQuizUrl(b.dataset.share));}});
    $("myQuizzes").querySelectorAll("[data-scores]").forEach(b=>b.onclick=()=>loadScores(b.dataset.scores,b.dataset.title));
  }catch(err){console.error(err);$("myQuizzes").innerHTML=`<p class="muted">โหลดไม่สำเร็จ: ${safeText(err.message)}</p>`;}
}
async function loadScores(id,title){
  const area=$("scoresArea");area.classList.remove("hidden");area.innerHTML="<p class='muted'>กำลังโหลดคะแนน...</p>";
  try{
    const {data,error}=await db.from("quiz_scores").select("player_name,score,total,created_at").eq("quiz_id",id).order("created_at",{ascending:false}).limit(100);
    if(error)throw error;
    area.innerHTML=`<h3>คะแนน: ${safeText(title)}</h3>${data.length?data.map(s=>`<div class="score-row"><span>${safeText(s.player_name)}<small>${new Date(s.created_at).toLocaleString("th-TH")}</small></span><b>${s.score}/${s.total}</b></div>`).join(""):"<p class='muted'>ยังไม่มีคะแนนที่บันทึก</p>"}`;
  }catch(err){area.innerHTML=`<p class="muted">โหลดคะแนนไม่สำเร็จ: ${safeText(err.message)}</p>`;}
}
$("manageOwnQuiz").onclick=()=>openManage();
init();
