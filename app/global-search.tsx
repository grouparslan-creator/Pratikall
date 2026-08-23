"use client";
import { useEffect,useMemo,useState } from "react";
import type { ModuleKey } from "./profile-types";
type Item={id:string;label:string;meta:string;module:ModuleKey};
export default function GlobalSearch({accounts,onNavigate}:{accounts:Array<{id:string;customerName:string;company:string;note:string}>;onNavigate:(m:ModuleKey)=>void}){
 const [q,setQ]=useState("");const [finance,setFinance]=useState<Record<string,Array<Record<string,unknown>>>>({});
 useEffect(()=>{fetch("/api/personal-finance",{cache:"no-store"}).then(r=>r.ok?r.json():{}).then(setFinance).catch(()=>setFinance({}))},[]);
 const items=useMemo<Item[]>(()=>[
  ...accounts.map(x=>({id:`a-${x.id}`,label:x.customerName,meta:`Müşteri · ${x.company||x.note||"Alacak"}`,module:"accounts" as ModuleKey})),
  ...(finance.expenses||[]).map(x=>({id:`e-${x.id}`,label:String(x.title||"Gider"),meta:`Gider · ${x.category||""}`,module:"expenses" as ModuleKey})),
  ...(finance.bills||[]).map(x=>({id:`b-${x.id}`,label:String(x.name||"Fatura"),meta:`Fatura · ${x.provider||""}`,module:"bills" as ModuleKey})),
  ...(finance.reminders||[]).map(x=>({id:`r-${x.id}`,label:String(x.title||"Not"),meta:`Not / Hatırlatma`,module:"assistant" as ModuleKey})),
 ],[accounts,finance]);
 const result=q.trim().length>1?items.filter(x=>`${x.label} ${x.meta}`.toLocaleLowerCase("tr-TR").includes(q.toLocaleLowerCase("tr-TR"))).slice(0,8):[];
 return <div className="global-search"><label><span>⌕</span><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Müşteri, işlem, fatura veya not ara" aria-label="Genel arama"/></label>{q&&<div className="global-search-results">{result.length?result.map(x=><button key={x.id} onClick={()=>{onNavigate(x.module);setQ("")}}><b>{x.label}</b><small>{x.meta}</small></button>):<p>Aramanızla eşleşen kayıt bulunamadı.</p>}</div>}</div>
}
