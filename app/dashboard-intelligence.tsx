"use client";
import { useEffect, useMemo, useState } from "react";
import type { ModuleKey } from "./profile-types";

type Account = { id:string; customerName:string; remainingAmount:number; paidAmount:number; dueDate:string; lastPaymentDate:string|null };
type Finance = { expenses:Array<{id:string;title:string;amount:number;spentAt:string}>; bills:Array<{id:string;name:string;amount:number;dueDate:string;status:string}>; subscriptions:Array<{id:string;serviceName:string;amount:number;nextPaymentDate:string;status:string}>; reminders:Array<{id:string;title:string;dueAt:string;completed:boolean}>; cards:Array<{id:string;cardName:string;currentDebt:number;dueDate:string;status:string}>; loans:Array<{id:string;loanName:string;remainingDebt:number;installmentAmount:number;nextPaymentDate:string;status:string}> };
type Event = { id:string; type:string; title:string; amount:number; date:string; module:ModuleKey; overdue:boolean };
const money = (v:number) => new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(v);
const today = () => new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Istanbul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());

export function NotificationBell({accounts}:{accounts:Account[]}) {
  const [open,setOpen]=useState(false); const [read,setRead]=useState<string[]>([]); const now=today();
  useEffect(()=>{ try { setRead(JSON.parse(localStorage.getItem("pratikall-read-notifications")||"[]")); } catch {} },[]);
  const items=accounts.filter(a=>a.remainingAmount>0 && a.dueDate<=new Date(Date.now()+7*86400000).toISOString().slice(0,10)).slice(0,8);
  const unread=items.filter(i=>!read.includes(`${i.id}:${i.dueDate}`)).length;
  function markAll(){ const keys=items.map(i=>`${i.id}:${i.dueDate}`); setRead(keys); localStorage.setItem("pratikall-read-notifications",JSON.stringify(keys)); }
  return <div className="notification-center"><button className="settings-button bell-button" onClick={()=>setOpen(!open)} aria-label="Bildirim merkezini aç">🔔{unread>0&&<b>{unread}</b>}</button>{open&&<div className="notification-popover"><div><strong>Bildirimler</strong><button onClick={markAll}>Tümünü okundu işaretle</button></div>{items.length?items.map(i=><article key={i.id} className={i.dueDate<now?"is-overdue":""}><span>{i.dueDate<now?"Geciken tahsilat":"Yaklaşan tahsilat"}</span><b>{i.customerName}</b><small>{money(i.remainingAmount)} · {i.dueDate}</small></article>):<p>Şu anda yeni bildiriminiz yok.</p>}</div>}</div>;
}

export default function DashboardIntelligence({accounts,onNavigate}:{accounts:Account[];onNavigate:(m:ModuleKey)=>void}) {
  const [finance,setFinance]=useState<Finance|null>(null); const [days,setDays]=useState(7); const now=today();
  useEffect(()=>{ void fetch("/api/personal-finance",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(setFinance).catch(()=>setFinance(null)); },[]);
  const model=useMemo(()=>{
    const f=finance; const month=now.slice(0,7); const future=new Date(Date.now()+days*86400000).toISOString().slice(0,10);
    const events:Event[]=[
      ...accounts.filter(a=>a.remainingAmount>0).map(a=>({id:`a-${a.id}`,type:"Tahsilat",title:a.customerName,amount:a.remainingAmount,date:a.dueDate,module:"accounts" as ModuleKey,overdue:a.dueDate<now})),
      ...(f?.bills||[]).filter(x=>x.status!=="paid").map(x=>({id:`b-${x.id}`,type:"Fatura",title:x.name,amount:x.amount,date:x.dueDate,module:"bills" as ModuleKey,overdue:x.dueDate<now})),
      ...(f?.subscriptions||[]).filter(x=>x.status==="active").map(x=>({id:`s-${x.id}`,type:"Abonelik",title:x.serviceName,amount:x.amount,date:x.nextPaymentDate,module:"subscriptions" as ModuleKey,overdue:x.nextPaymentDate<now})),
      ...(f?.cards||[]).filter(x=>x.status!=="paid").map(x=>({id:`c-${x.id}`,type:"Kredi kartı",title:x.cardName,amount:x.currentDebt,date:x.dueDate,module:"cards" as ModuleKey,overdue:x.dueDate<now})),
      ...(f?.loans||[]).filter(x=>x.status!=="paid").map(x=>({id:`l-${x.id}`,type:"Kredi taksiti",title:x.loanName,amount:x.installmentAmount,date:x.nextPaymentDate,module:"loans" as ModuleKey,overdue:x.nextPaymentDate<now})),
      ...(f?.reminders||[]).filter(x=>!x.completed&&x.dueAt).map(x=>({id:`r-${x.id}`,type:"Hatırlatma",title:x.title,amount:0,date:x.dueAt.slice(0,10),module:"assistant" as ModuleKey,overdue:x.dueAt.slice(0,10)<now})),
    ].sort((a,b)=>a.date.localeCompare(b.date));
    const debt=(f?.cards||[]).reduce((s,x)=>s+x.currentDebt,0)+(f?.loans||[]).reduce((s,x)=>s+x.remainingDebt,0)+(f?.bills||[]).filter(x=>x.status!=="paid").reduce((s,x)=>s+x.amount,0);
    const income=accounts.filter(a=>(a.lastPaymentDate||"").startsWith(month)).reduce((s,a)=>s+a.paidAmount,0);
    const expense=(f?.expenses||[]).filter(x=>x.spentAt.startsWith(month)).reduce((s,x)=>s+x.amount,0);
    const upcoming=events.filter(e=>!e.overdue&&e.date<=new Date(Date.now()+7*86400000).toISOString().slice(0,10)).reduce((s,e)=>s+e.amount,0);
    const overdue=accounts.filter(a=>a.remainingAmount>0&&a.dueDate<now).reduce((s,a)=>s+a.remainingAmount,0);
    return {debt,income,expense,upcoming,overdue,events:events.filter(e=>e.overdue||e.date<=future)};
  },[accounts,finance,days,now]);
  const receivable=accounts.reduce((s,a)=>s+a.remainingAmount,0);
  const insights:string[]=[]; const todayEvents=model.events.filter(e=>e.date===now); if(todayEvents.length) insights.push(`Bugün ${todayEvents.length} işlemin var.`); if(model.overdue) insights.push(`${money(model.overdue)} tutarında geciken tahsilat bulunuyor.`); if(model.upcoming) insights.push(`Önümüzdeki 7 günde ${money(model.upcoming)} tutarında işlem yaklaşıyor.`);
  return <>
    <section className="intelligence-section"><div className="overview-panel-head"><div><span>FİNANSAL ÖZET</span><h2>Tek bakışta güncel durum</h2></div></div><div className="intelligence-grid">{[
      ["Toplam Alacak",receivable,"accounts"],["Toplam Borç",model.debt,"loans"],["Bu Ay Gelir",model.income,"accounts"],["Bu Ay Gider",model.expense,"expenses"],["Yaklaşan Ödemeler",model.upcoming,"calendar"],["Geciken Tahsilatlar",model.overdue,"accounts"],
    ].map(([label,value,module])=><button key={String(label)} onClick={()=>onNavigate(module as ModuleKey)}><span>{label}</span><strong>{money(Number(value))}</strong><small>Detayları aç →</small></button>)}</div></section>
    <section className="today-insights"><div><span>BUGÜN SENİN İÇİN</span><h2>Önemli gelişmeler</h2></div>{insights.length?<div>{insights.map(x=><article key={x}>✦ {x}</article>)}</div>:<div className="smart-empty"><b>Her şey yolunda</b><p>Yaklaşan veya geciken önemli bir finansal hareket olduğunda burada göreceksin.</p></div>}</section>
    <section className="timeline-section"><div className="overview-panel-head"><div><span>YAKLAŞAN İŞLEMLER</span><h2>Tek zaman çizelgesi</h2></div><div className="timeline-filters">{[7,15,30].map(x=><button className={days===x?"active":""} key={x} onClick={()=>setDays(x)}>{x} gün</button>)}</div></div>{model.events.length?<div className="smart-timeline">{model.events.slice(0,12).map(e=><button key={e.id} className={e.overdue?"is-overdue":""} onClick={()=>onNavigate(e.module)}><span>{e.type}</span><div><b>{e.title}</b><small>{e.date}</small></div><strong>{e.amount?money(e.amount):"—"}</strong>{e.overdue&&<em>Gecikti</em>}</button>)}</div>:<div className="smart-empty"><b>Yaklaşan işlem yok</b><p>Fatura, kart, kredi, abonelik, tahsilat ve hatırlatmalar burada birlikte görünür.</p></div>}</section>
  </>;
}
