export type ResultTimestamp=Readonly<{iso:string,label:string}>;
export function resultTimestamp(date:Date):ResultTimestamp{
 const pad=(n:number)=>String(n).padStart(2,'0');
 const minutes=-date.getTimezoneOffset(),absolute=Math.abs(minutes);
 const zone=minutes===0?'UTC':`UTC${minutes>0?'+':'-'}${pad(Math.floor(absolute/60))}:${pad(absolute%60)}`;
 const label=`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())} ${zone}`;
 return Object.freeze({iso:date.toISOString(),label});
}
