/* Point-in-time universe integrity guard.
 * This module never infers historical membership from today's constituents.
 * A validation can PASS only when explicit dated membership snapshots are supplied.
 */

export function validateUniverseSnapshots(snapshots,{startDate,endDate}={}){
  const rows=Array.isArray(snapshots)?snapshots:[];
  const errors=[];
  const seen=new Set();
  let minDate=null,maxDate=null;
  for(const row of rows){
    const date=String(row?.date||'').slice(0,10);
    const symbols=Array.isArray(row?.symbols)?row.symbols:[];
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){errors.push('INVALID_SNAPSHOT_DATE');continue}
    if(!symbols.length){errors.push(`EMPTY_SNAPSHOT:${date}`);continue}
    if(!seen.has(date))seen.add(date);else errors.push(`DUPLICATE_SNAPSHOT:${date}`);
    const normalized=symbols.map(s=>String(s||'').trim().toUpperCase()).filter(Boolean);
    if(new Set(normalized).size!==normalized.length)errors.push(`DUPLICATE_SYMBOL:${date}`);
    minDate=minDate==null||date<minDate?date:minDate;
    maxDate=maxDate==null||date>maxDate?date:maxDate;
  }
  if(startDate&&minDate&&minDate>String(startDate).slice(0,10))errors.push('SNAPSHOT_RANGE_START_NOT_COVERED');
  if(endDate&&maxDate&&maxDate<String(endDate).slice(0,10))errors.push('SNAPSHOT_RANGE_END_NOT_COVERED');
  if(!rows.length)return{status:'BLOCKED',classification:'SURVIVORSHIP-UNVALIDATED',source:null,snapshotCount:0,reason:'No point-in-time historical universe snapshots are configured; current constituents must never be used as a historical proxy.'};
  return errors.length?{status:'BLOCKED',classification:'SURVIVORSHIP-UNVALIDATED',source:'explicit point-in-time snapshots',snapshotCount:rows.length,minDate,maxDate,errors}:{status:'PASS',classification:'SURVIVORSHIP-AWARE',source:'explicit point-in-time snapshots',snapshotCount:rows.length,minDate,maxDate,errors:[]};
}

export function requireHistoricalUniverse(snapshots,range){
  const result=validateUniverseSnapshots(snapshots,range);
  if(result.status!=='PASS')return{eligible:false,reason:result.reason||result.errors?.join(',')||'Historical universe integrity not verified',...result};
  return{eligible:true,...result};
}
