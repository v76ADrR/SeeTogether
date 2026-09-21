import {flushSync} from 'react-dom';
import {registerAtlasTools} from './agent-tools';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Activity,ArrowUpRight,Bone,ChevronRight,Focus,HeartPulse,Info,Layers3,Lock,Pause,RotateCcw,RotateCw,ScanFace,Search,Unlock,X,Zap} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Slider} from '@/components/ui/slider';
import {Switch} from '@/components/ui/switch';
import {Sheet,SheetContent,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {Combobox,ComboboxInput,ComboboxContent,ComboboxList,ComboboxItem,ComboboxEmpty} from '@/components/ui/combobox';
import AnatomyScene from './scene';
import {
 DEFAULT_VISIBLE,
 SKELETON_VISIBLE,
 ORGANS_VISIBLE,
 TRIGEMINAL_VISIBLE,
 FACE_VISIBLE,
 DENTAL_VISIBLE,
 DENTAL_QUADRANT_COLORS,
 DENTAL_TYPE_COLORS,
 SKELETON_SYSTEM_IDS,
 ORGAN_SYSTEM_IDS,
 DEFAULT_NERVOUS_LAYERS,
 DEFAULT_NERVOUS_SIDE,
 DEFAULT_SMAS_LAYERS,
 DEFAULT_FACE_MUSCLE_LAYERS,
 DEFAULT_DENTAL_LAYERS,
 FACE_MUSCLE_ROWS,
 SYSTEMS,
 EXPLANATIONS,
 explanation,
 isTooth,
 isJaw,
 isDentalStructure,
 partMatchesDental,
 type Atlas,
 type Concept,
 type SceneState,
 type SystemId,
 type View,
 type NervousSide,
 type NervousLayers,
 type NervousSelection,
 type SmasLayers,
 type SmasSelection,
 type FaceMuscleLayers,
 type FaceMuscleId,
 type DentalLayers
} from './anatomy';
import {overlayCard} from './trigeminal';
import {FACIAL_NERVE_ROWS,DEEP_TISSUE_ROWS,smasCard,SMAS_COLOR,FAT_COLOR,FACIAL_NERVE_COLOR,PAROTID_COLOR,LYMPH_COLOR,PERIOSTEUM_COLOR} from './smas';

const ToothIcon = ({ size = 15 }: { size?: number }) => (
 <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  <path d="M7 3C4.2 3 2 5.2 2 8c0 3.5 1.5 7.5 3 11 1 2.3 3 2.3 4 0l1-3.5c.5-1.5 2.5-1.5 3 0l1 3.5c1 2.3 3 2.3 4 0 1.5-3.5 3-7.5 3-11 0-2.8-2.2-5-5-5-2 0-3.5 1.2-4 2.5C10.5 4.2 9 3 7 3z"/>
 </svg>
);

type PillType = 'all' | 'skeleton' | 'trigeminal' | 'face' | 'dental' | 'organs';

const initial:SceneState={
 explode:0,
 visible:DEFAULT_VISIBLE,
 selected:[],
 isolate:false,
 view:'three-quarter',
 rotate:false,
 reset:0,
 nervousOverlay:false,
 nervousSelection:null,
 nervousLayers:DEFAULT_NERVOUS_LAYERS,
 nervousSide:DEFAULT_NERVOUS_SIDE,
 smasOverlay:false,
 smasSelection:null,
 smasLayers:DEFAULT_SMAS_LAYERS,
 smasSide:DEFAULT_NERVOUS_SIDE,
 faceMuscleLayers:DEFAULT_FACE_MUSCLE_LAYERS,
 dentalOverlay:false,
 dentalLayers:DEFAULT_DENTAL_LAYERS,
 dentalSide:DEFAULT_NERVOUS_SIDE
};

export default function Home(){
 const detailTitle=useRef<HTMLHeadingElement>(null);
 const [atlas,setAtlas]=useState<Atlas|null>(null);
 const [activePill,setActivePill]=useState<PillType>('all');
 const [state,setState]=useState<SceneState>(initial);
 const [progress,setProgress]=useState(0);
 const [error,setError]=useState('');
 const [panel,setPanel]=useState<'layers'|'search'|null>(null);
 const [details,setDetails]=useState(false);
 const [about,setAbout]=useState(false);
 const [query,setQuery]=useState('');
 const [chosen,setChosen]=useState<Concept|null>(null);
 type AllSnapshot = {
  visible: SystemId[];
  nervousLayers: NervousLayers;
 };

 // Snapshot ref to persist All visibility and layers across pill switching
 const allSnapshotRef=useRef<AllSnapshot>({
  visible: DEFAULT_VISIBLE,
  nervousLayers: DEFAULT_NERVOUS_LAYERS,
 });

 // Snapshot ref to persist Skeleton visibility across pill switching
 const skeletonVisibleRef=useRef<SystemId[]>(SKELETON_VISIBLE);

 type TrigeminalSnapshot = {
  nervousLayers: NervousLayers;
  nervousSide: NervousSide;
  visible: SystemId[];
 };

 // Snapshot ref to persist Trigeminal overlay layers, side, and visibility across pill switching
 const trigeminalSnapshotRef=useRef<TrigeminalSnapshot>({
  nervousLayers: DEFAULT_NERVOUS_LAYERS,
  nervousSide: DEFAULT_NERVOUS_SIDE,
  visible: TRIGEMINAL_VISIBLE
 });

 type FaceSnapshot = {
  smasLayers: SmasLayers;
  faceMuscleLayers: FaceMuscleLayers;
  side: NervousSide;
  visible: SystemId[];
 };

 // Snapshot ref to persist Face overlay layers, side, and visibility across pill switching
 const faceSnapshotRef=useRef<FaceSnapshot>({
  smasLayers: DEFAULT_SMAS_LAYERS,
  faceMuscleLayers: DEFAULT_FACE_MUSCLE_LAYERS,
  side: DEFAULT_NERVOUS_SIDE,
  visible: FACE_VISIBLE
 });

 type DentalSnapshot = {
  dentalLayers: DentalLayers;
  side: NervousSide;
  visible: SystemId[];
 };

 // Snapshot ref to persist Dental overlay layers, side, and visibility across pill switching
 const dentalSnapshotRef=useRef<DentalSnapshot>({
  dentalLayers: DEFAULT_DENTAL_LAYERS,
  side: DEFAULT_NERVOUS_SIDE,
  visible: DENTAL_VISIBLE
 });

 // Snapshot ref to persist Organs visibility across pill switching
 const organsVisibleRef=useRef<SystemId[]>(ORGANS_VISIBLE);

 // Lock state & helper
 const [locks,setLocks]=useState<Record<string,boolean>>({});
 const toggleLock=(id:string)=>setLocks(l=>({...l,[id]:!l[id]}));
 const unlockAll=()=>setLocks({});
 const lockCount=Object.values(locks).filter(Boolean).length;

 const lockAllCurrent = () => {
  setLocks(prev => {
   const next = { ...prev };
   if (activePill === 'all') {
    activeSystems.forEach(s => { next[s.id] = true; });
   } else if (activePill === 'skeleton') {
    skeletonSystems.forEach(s => { next[s.id] = true; });
   } else if (activePill === 'trigeminal') {
    trigeminalBaseSystems.forEach(s => { next[s.id] = true; });
    ['cnv', 'v1', 'v2', 'v3', 'v3Jaw', 'v3Temple'].forEach(k => { next['nervous_' + k] = true; });
   } else if (activePill === 'face') {
    faceBaseSystems.forEach(s => { next[s.id] = true; });
    ['smas', 'fat', 'temporal', 'zygomatic', 'buccal', 'marginal', 'cervical', 'parotid', 'lymph', 'periosteum'].forEach(k => { next['smas_' + k] = true; });
    ['masseter', 'temporalis', 'buccinator', 'orbicularis', 'zygomaticus', 'pterygoids'].forEach(k => { next['facemuscle_' + k] = true; });
   } else if (activePill === 'dental') {
    dentalBaseSystems.forEach(s => { next[s.id] = true; });
    ['upperJaw', 'lowerJaw', 'teeth', 'q1', 'q2', 'q3', 'q4', 'incisor', 'canine', 'premolar', 'molar'].forEach(k => { next['dental_' + k] = true; });
   } else if (activePill === 'organs') {
    organSystems.forEach(s => { next[s.id] = true; });
   }
   return next;
  });
 };

 const applyLocks=(s:SceneState,focus:string):SceneState=>{
  const next={...s};
  if(focus!=='stock'){
   next.visible=next.visible.filter(x=>locks[x]);
  }
  if(focus!=='trigeminal'){
   next.nervousLayers={...next.nervousLayers};
   for(const k of Object.keys(next.nervousLayers)){
    const key=k as keyof NervousLayers;
    if(!locks['nervous_'+key] && !(locks['nervous_v3'] && (key==='v3Jaw'||key==='v3Temple'))){
     (next.nervousLayers as any)[key]=false;
    }
   }
   if(Object.values(next.nervousLayers).every(v=>!v)){
    next.nervousSelection=null;
    if(!Object.keys(locks).some(k=>k.startsWith('nervous_')&&locks[k])){
     next.nervousOverlay=false;
    }
   }
  }
  if(focus!=='face'){
   if(next.smasLayers){
    next.smasLayers={...next.smasLayers};
    for(const k of Object.keys(next.smasLayers)){
     const key=k as keyof SmasLayers;
     if(!locks['smas_'+key] && !(locks['smas_cn7'] && (key==='temporal'||key==='zygomatic'||key==='buccal'||key==='marginal'||key==='cervical'))){
      (next.smasLayers as any)[key]=false;
     }
    }
    if(Object.values(next.smasLayers).every(v=>!v)){
     next.smasSelection=null;
     if(!Object.keys(locks).some(k=>k.startsWith('smas_')&&locks[k])){
      next.smasOverlay=false;
     }
    }
   }
   if(next.faceMuscleLayers){
    next.faceMuscleLayers={...next.faceMuscleLayers};
    for(const k of Object.keys(next.faceMuscleLayers)){
     const key=k as keyof FaceMuscleLayers;
     if(!locks['facemuscle_'+key]){
      (next.faceMuscleLayers as any)[key]=false;
     }
    }
   }
  }
  if(focus!=='dental'){
   if(next.dentalLayers){
    next.dentalLayers={...next.dentalLayers};
    for(const k of Object.keys(next.dentalLayers)){
     const key=k as keyof DentalLayers;
     if(!locks['dental_'+key]){
      (next.dentalLayers as any)[key]=false;
     }
    }
    if(Object.values(next.dentalLayers).every(v=>!v)){
     if(!Object.keys(locks).some(k=>k.startsWith('dental_')&&locks[k])){
      next.dentalOverlay=false;
     }
    }
   }
  }
  return next;
 };

 useEffect(()=>{
  const abort=new AbortController();
  setProgress(0);
  setError('');
  setAtlas(null);
  setChosen(null);
  setDetails(false);
  setState({...initial,visible:DEFAULT_VISIBLE});
  fetch('/models/atlas.json',{signal:abort.signal})
   .then(r=>{if(!r.ok)throw new Error('The anatomy catalogue could not be loaded.');return r.json();})
   .then(data=>setAtlas(data as Atlas))
   .catch(e=>{if(e.name!=='AbortError')setError(e.message);});
  return()=>abort.abort();
 },[]);

 useEffect(()=>{
  const key=(e:KeyboardEvent)=>{
   if(e.key==='/'&&!(e.target instanceof HTMLInputElement)&&!(e.target instanceof HTMLTextAreaElement)){
    e.preventDefault();
    setPanel('search');
    setDetails(false);
   }
  };
  window.addEventListener('keydown',key);
  return()=>window.removeEventListener('keydown',key);
 },[]);

 const parts=useMemo(()=>new Map(atlas?.parts.map(p=>[p.id,p])),[atlas]);
 const counts=useMemo(()=>Object.fromEntries(SYSTEMS.map(s=>[s.id,atlas?.parts.filter(p=>p.system===s.id).length??0])),[atlas]);
 const activeSystems=SYSTEMS.filter(s=>counts[s.id]>0);
 const selectedParts=state.selected.map(id=>parts.get(id)).filter(p=>!!p),selected=selectedParts[0],system=SYSTEMS.find(s=>s.id===selected?.system);
 const visibleCount=atlas?.parts.filter(p=>{
  if(state.isolate)return state.selected.includes(p.id);
  if(state.selected.includes(p.id))return true;
  if(state.dentalOverlay&&isDentalStructure(p)){
   return partMatchesDental(p,state.dentalLayers??DEFAULT_DENTAL_LAYERS,state.dentalSide??'both');
  }
  return state.visible.includes(p.system);
 }).length??0;
 
 const results=useMemo(()=>{
  if(!atlas)return[];
  const term=query.toLowerCase().trim();
  if(!term)return ['heart','brain','liver','stomach','spleen','pancreas','urinary bladder','trachea'].map(name=>atlas.concepts.find(c=>c.name.toLowerCase()===name)).filter((x):x is Concept=>!!x);
  return atlas.concepts.filter(c=>c.name.toLowerCase().includes(term)||c.id.toLowerCase().includes(term)).sort((a,b)=>a.name.length-b.name.length).slice(0,80);
 },[atlas,query]);

 const choose=(c:Concept)=>{
  setChosen(c);
  setState(s=>({...s,selected:c.elements,isolate:false,rotate:false,nervousSelection:null,smasSelection:null}));
  setDetails(true);
  setPanel(null);
 };

 useEffect(()=>{
  if(!atlas)return;
  return registerAtlasTools(atlas,c=>flushSync(()=>choose(c)));
 },[atlas]);

 const choosePart=(id:string)=>{
  const p=parts.get(id);
  if(!p)return;
  setChosen({id:p.conceptId,name:p.name,elements:[id]});
  setState(s=>({...s,selected:[id],isolate:false,rotate:false,nervousSelection:null,smasSelection:null}));
  setDetails(true);
  setPanel(null);
 };

 const chooseNervousSelection=(sel:NervousSelection|null)=>{
  setState(s=>({...s,nervousSelection:sel,smasSelection:null,selected:[],isolate:false,rotate:false}));
  if(sel){
   setChosen(null);
   setDetails(true);
  }
 };

 const chooseSmasSelection=(sel:SmasSelection|null)=>{
  setState(s=>({...s,smasSelection:sel,nervousSelection:null,selected:[],isolate:false,rotate:false}));
  if(sel){
   setChosen(null);
   setDetails(true);
  }
 };

 const toggle=(id:SystemId)=>{
  setDetails(false);
  setState(s=>{
   const nextVisible=s.visible.includes(id)?s.visible.filter(x=>x!==id):[...s.visible,id];
   if(activePill==='all'){
    allSnapshotRef.current.visible=nextVisible;
   }
   if(activePill==='skeleton'){
    skeletonVisibleRef.current=nextVisible.filter(x=>SKELETON_SYSTEM_IDS.includes(x));
   }
   if(activePill==='trigeminal'){
    trigeminalSnapshotRef.current.visible=nextVisible;
   }
   if(activePill==='face'){
    faceSnapshotRef.current.visible=nextVisible;
   }
   if(activePill==='dental'){
    dentalSnapshotRef.current.visible=nextVisible;
   }
   if(activePill==='organs'){
    organsVisibleRef.current=nextVisible.filter(x=>ORGAN_SYSTEM_IDS.includes(x));
   }
   return {...s,selected:[],isolate:false,visible:nextVisible};
  });
 };

 const reset=()=>{
  allSnapshotRef.current={
   visible:DEFAULT_VISIBLE,
   nervousLayers:DEFAULT_NERVOUS_LAYERS,
  };
  skeletonVisibleRef.current=SKELETON_VISIBLE;
  trigeminalSnapshotRef.current={
   nervousLayers:DEFAULT_NERVOUS_LAYERS,
   nervousSide:DEFAULT_NERVOUS_SIDE,
   visible:TRIGEMINAL_VISIBLE
  };
  faceSnapshotRef.current={
   smasLayers:DEFAULT_SMAS_LAYERS,
   faceMuscleLayers:DEFAULT_FACE_MUSCLE_LAYERS,
   side:DEFAULT_NERVOUS_SIDE,
   visible:FACE_VISIBLE
  };
  dentalSnapshotRef.current={
   dentalLayers:DEFAULT_DENTAL_LAYERS,
   side:DEFAULT_NERVOUS_SIDE,
   visible:DENTAL_VISIBLE
  };
  organsVisibleRef.current=ORGANS_VISIBLE;
  setActivePill('all');
  setLocks({});
  setState(s=>({...initial,visible:DEFAULT_VISIBLE,reset:s.reset+1}));
  setChosen(null);
  setDetails(false);
  setPanel(null);
 };

 const openPanel=(next:'layers'|'search')=>{
  setDetails(false);
  setPanel(p=>p===next?null:next);
 };

 const patchNervousLayers=(patch:Partial<NervousLayers>)=>{
  setState(s=>{
   const nextLayers={...s.nervousLayers,...patch};
   if(activePill==='all'){
    allSnapshotRef.current.nervousLayers=nextLayers;
   }
   if(activePill==='trigeminal'){
    trigeminalSnapshotRef.current.nervousLayers=nextLayers;
   }
   const anyNervousOn=Object.values(nextLayers).some(Boolean);
   return {
    ...s,
    nervousLayers:nextLayers,
    nervousOverlay:anyNervousOn,
    nervousSelection:anyNervousOn?s.nervousSelection:null
   };
  });
 };

 const setNervousSide=(side:NervousSide)=>{
  if(activePill==='trigeminal'){
   trigeminalSnapshotRef.current.nervousSide=side;
  }
  setState(s=>({...s,nervousSide:side,nervousSelection:null,reset:s.reset+1}));
 };

 const patchSmasLayers=(patch:Partial<SmasLayers>)=>{
  setState(s=>{
   const nextLayers={...(s.smasLayers??DEFAULT_SMAS_LAYERS),...patch};
   if(activePill==='face'){
    faceSnapshotRef.current.smasLayers=nextLayers;
   }
   const anySmasOn=Object.values(nextLayers).some(Boolean);
   return {
    ...s,
    smasLayers:nextLayers,
    smasOverlay:activePill==='face',
    smasSelection:anySmasOn?s.smasSelection:null
   };
  });
 };

 const patchFaceMuscleLayers=(patch:Partial<FaceMuscleLayers>)=>{
  setState(s=>{
   const nextLayers={...(s.faceMuscleLayers??DEFAULT_FACE_MUSCLE_LAYERS),...patch};
   if(activePill==='face'){
    faceSnapshotRef.current.faceMuscleLayers=nextLayers;
   }
   return {
    ...s,
    faceMuscleLayers:nextLayers
   };
  });
 };

 const setFaceSide=(side:NervousSide)=>{
  if(activePill==='face'){
   faceSnapshotRef.current.side=side;
  }
  setState(s=>({...s,smasSide:side,smasSelection:null,reset:s.reset+1}));
 };

 const patchDentalLayers=(patch:Partial<DentalLayers>)=>{
  setState(s=>{
   const nextLayers={...(s.dentalLayers??DEFAULT_DENTAL_LAYERS),...patch};
   if(activePill==='dental'){
    dentalSnapshotRef.current.dentalLayers=nextLayers;
   }
   const anyDentalOn=Object.values(nextLayers).some(Boolean);
   return {
    ...s,
    dentalLayers:nextLayers,
    dentalOverlay:activePill==='dental'||anyDentalOn
   };
  });
 };

 const setDentalSide=(side:NervousSide)=>{
  if(activePill==='dental'){
   dentalSnapshotRef.current.side=side;
  }
  setState(s=>({...s,dentalSide:side,reset:s.reset+1}));
 };

 const selectPill=(pill:PillType)=>{
  if(activePill==='all'){
   allSnapshotRef.current={
    visible:state.visible,
    nervousLayers:state.nervousLayers,
   };
  }
  if(activePill==='skeleton'){
   skeletonVisibleRef.current=state.visible.filter(x=>SKELETON_SYSTEM_IDS.includes(x));
  }
  if(activePill==='trigeminal'){
   trigeminalSnapshotRef.current={
    nervousLayers:state.nervousLayers,
    nervousSide:state.nervousSide,
    visible:state.visible.filter(x=>['skeletal','integumentary'].includes(x))
   };
  }
  if(activePill==='face'){
   faceSnapshotRef.current={
    smasLayers:state.smasLayers??DEFAULT_SMAS_LAYERS,
    faceMuscleLayers:state.faceMuscleLayers??DEFAULT_FACE_MUSCLE_LAYERS,
    side:state.smasSide??DEFAULT_NERVOUS_SIDE,
    visible:state.visible.filter(x=>['skeletal','integumentary'].includes(x))
   };
  }
  if(activePill==='dental'){
   dentalSnapshotRef.current={
    dentalLayers:state.dentalLayers??DEFAULT_DENTAL_LAYERS,
    side:state.dentalSide??DEFAULT_NERVOUS_SIDE,
    visible:state.visible.filter(x=>['skeletal','integumentary'].includes(x))
   };
  }
  if(activePill==='organs'){
   organsVisibleRef.current=state.visible.filter(x=>ORGAN_SYSTEM_IDS.includes(x));
  }
  setActivePill(pill);
  setChosen(null);
  setDetails(false);

  if(pill==='all'){
   setState(s=>{
    const saved=allSnapshotRef.current;
    const savedVisible=saved.visible??DEFAULT_VISIBLE;
    const anyNervousOn=Object.values(saved.nervousLayers).some(Boolean);
    return {...s,nervousOverlay:anyNervousOn,smasOverlay:false,dentalOverlay:false,nervousSelection:null,smasSelection:null,nervousLayers:saved.nervousLayers,selected:[],isolate:false,visible:savedVisible};
   });
  } else if(pill==='skeleton'){
    setState(s=>{
     const savedSkeleton=(skeletonVisibleRef.current??SKELETON_VISIBLE).filter(x=>SKELETON_SYSTEM_IDS.includes(x));
     return {...s,nervousOverlay:false,smasOverlay:false,dentalOverlay:false,nervousSelection:null,smasSelection:null,selected:[],isolate:false,visible:savedSkeleton};
    });
   } else if(pill==='trigeminal'){
    setState(s=>{
     const saved=trigeminalSnapshotRef.current;
     const savedVisible=(saved.visible??TRIGEMINAL_VISIBLE).filter(x=>['skeletal','integumentary'].includes(x));
     const anyNervousOn=Object.values(saved.nervousLayers).some(Boolean);
     return {...s,nervousOverlay:anyNervousOn,smasOverlay:false,dentalOverlay:false,nervousSelection:null,smasSelection:null,nervousLayers:saved.nervousLayers,nervousSide:saved.nervousSide,selected:[],isolate:false,visible:savedVisible,view:'three-quarter',reset:s.reset+1};
    });
   } else if(pill==='face'){
    setState(s=>{
     const saved=faceSnapshotRef.current;
     const savedVisible=(saved.visible??FACE_VISIBLE).filter(x=>['skeletal','integumentary'].includes(x));
     return {...s,smasOverlay:true,nervousOverlay:false,dentalOverlay:false,smasSelection:null,nervousSelection:null,smasLayers:saved.smasLayers,smasSide:saved.side,faceMuscleLayers:saved.faceMuscleLayers,selected:[],isolate:false,visible:savedVisible,view:'three-quarter',reset:s.reset+1};
    });
   } else if(pill==='dental'){
    setState(s=>{
     const saved=dentalSnapshotRef.current;
     const savedVisible=(saved.visible??DENTAL_VISIBLE).filter(x=>['skeletal','integumentary'].includes(x));
     const anyDentalOn=Object.values(saved.dentalLayers).some(Boolean);
     return {...s,dentalOverlay:anyDentalOn,nervousOverlay:false,smasOverlay:false,nervousSelection:null,smasSelection:null,dentalLayers:saved.dentalLayers,dentalSide:saved.side,selected:[],isolate:false,visible:savedVisible,view:'three-quarter',reset:s.reset+1};
    });
   } else if(pill==='organs'){
    setState(s=>{
     const savedOrgans=(organsVisibleRef.current??ORGANS_VISIBLE).filter(x=>ORGAN_SYSTEM_IDS.includes(x));
     return {...s,nervousOverlay:false,smasOverlay:false,dentalOverlay:false,nervousSelection:null,smasSelection:null,selected:[],isolate:false,visible:savedOrgans};
    });
   }
  };

 const nervousDetail = state.nervousOverlay && state.nervousSelection ? overlayCard(state.nervousSelection) : null;
 const smasDetail = state.smasOverlay && state.smasSelection ? smasCard(state.smasSelection) : null;

 // Filter rows based on active pill
 const showSkeletonRows = activePill === 'all' || activePill === 'skeleton';
 const showTrigeminalRows = activePill === 'all' || activePill === 'trigeminal';
 const showFaceRows = activePill === 'face';
 const showDentalRows = activePill === 'all' || activePill === 'dental';
 const showOrganRows = activePill === 'all' || activePill === 'organs';

 // Skeleton group includes skeleton, muscles, connective tissue, body surface
 const skeletonSystems = activeSystems.filter(s=>SKELETON_SYSTEM_IDS.includes(s.id));
 // Base systems for Trigeminal, Face & Dental (Skeleton + Body surface)
 const trigeminalBaseSystems = activeSystems.filter(s=>TRIGEMINAL_VISIBLE.includes(s.id));
 const faceBaseSystems = activeSystems.filter(s=>FACE_VISIBLE.includes(s.id));
 const dentalBaseSystems = activeSystems.filter(s=>DENTAL_VISIBLE.includes(s.id));
 // Organ group includes visceral organs, cardiac, vascular, nervous
 const organSystems = activeSystems.filter(s=>ORGAN_SYSTEM_IDS.includes(s.id));

 return <main className="studio">
  {atlas&&<AnatomyScene 
   atlas={atlas} 
   state={{...state,inspectorOpen:details&&(selectedParts.length>0||!!state.nervousSelection||!!state.smasSelection)}} 
   onSelect={choosePart} 
   onNervousSelect={chooseNervousSelection}
   onSmasSelect={chooseSmasSelection}
   onProgress={n=>{setProgress(n);if(n===100)setError('');}} 
   onError={setError}
  />}
  <div className="vignette"/>
  {/* Commented out to free up space: Header identity */}
  {/* <header className="identity">
   <div className="eyebrow"><span className="status-dot"/> INTERACTIVE ANATOMY</div>
   <h1>Human Atlas<Badge variant="outline" className="edition">3D</Badge></h1>
   <div className="identity-meta">{atlas?atlas.parts.length.toLocaleString():'2,234'} modeled pieces <span>·</span> BodyParts3D</div>
  </header> */}

  {/* Commented out to free up space: Search and info top nav */}
  {/* <nav className="top-actions" aria-label="Explorer panels">
   <Button variant="ghost" className={panel==='search'?'active':''} onClick={()=>openPanel('search')} aria-label="Search anatomy">
    <Search size={18}/><span>Find a structure</span><kbd>/</kbd>
   </Button>
   <Button variant="ghost" className="icon-button" title="Interactive Sandbox" aria-label="Open Interactive Sandbox" onClick={()=>{ window.history.pushState({}, '', '/sandbox'); window.dispatchEvent(new Event('popstate')); }}>
    🧪
   </Button>
   <Button variant="ghost" className="icon-button" aria-label="About this atlas" onClick={()=>{setDetails(false);setPanel(null);setAbout(true);}}>
    <Info size={18}/>
   </Button>
  </nav> */}

  <section className={`layers-panel glass ${panel==='layers'?'mobile-open':''}`} aria-label="Anatomical layers">
   <div className="panel-heading">
    <span>Systems</span>
    <div className="panel-heading-actions">
     <Button variant="ghost" className="mobile-only icon-button" onClick={()=>setPanel(null)} aria-label="Close systems"><X size={18}/></Button>
     <Badge variant="secondary" className="desktop-only small-number">{activeSystems.length}</Badge>
    </div>
   </div>

   {/* Systems pills: All | Skeleton | Trigeminal | Face | Dental | Organs */}
   <div className="layer-presets" role="tablist" aria-label="Systems view selector">
    <Button variant="ghost" aria-pressed={activePill==='all'} onClick={()=>selectPill('all')} title="All Systems" aria-label="All Systems"><Layers3 size={15}/></Button>
    <Button variant="ghost" aria-pressed={activePill==='skeleton'} onClick={()=>selectPill('skeleton')} title="Skeleton & Soft Tissue" aria-label="Skeleton"><Bone size={15}/></Button>
    <Button variant="ghost" aria-pressed={activePill==='trigeminal'} onClick={()=>selectPill('trigeminal')} title="Trigeminal (CN V)" aria-label="Trigeminal"><Zap size={15}/></Button>
    <Button variant="ghost" aria-pressed={activePill==='face'} onClick={()=>selectPill('face')} title="Face & SMAS" aria-label="Face"><ScanFace size={15}/></Button>
    <Button variant="ghost" aria-pressed={activePill==='dental'} onClick={()=>selectPill('dental')} title="Dentition & Jaws (32 Teeth)" aria-label="Dental"><ToothIcon size={15}/></Button>
    <Button variant="ghost" aria-pressed={activePill==='organs'} onClick={()=>selectPill('organs')} title="Organs & Viscera" aria-label="Organs"><HeartPulse size={15}/></Button>
   </div>

   {/* Laterality controls for Trigeminal, Face, and Dental pills */}
   {activePill==='trigeminal' && (
    <div className="side-presets layer-presets">
     <Button variant="ghost" aria-pressed={state.nervousSide==='left'} onClick={()=>setNervousSide('left')}>Left</Button>
     <Button variant="ghost" aria-pressed={state.nervousSide==='right'} onClick={()=>setNervousSide('right')}>Right</Button>
     <Button variant="ghost" aria-pressed={state.nervousSide==='both'} onClick={()=>setNervousSide('both')}>Both</Button>
    </div>
   )}
   {activePill==='face' && (
    <div className="side-presets layer-presets">
     <Button variant="ghost" aria-pressed={(state.smasSide??'left')==='left'} onClick={()=>setFaceSide('left')}>Left</Button>
     <Button variant="ghost" aria-pressed={state.smasSide==='right'} onClick={()=>setFaceSide('right')}>Right</Button>
     <Button variant="ghost" aria-pressed={state.smasSide==='both'} onClick={()=>setFaceSide('both')}>Both</Button>
    </div>
   )}
   {activePill==='dental' && (
    <div className="side-presets layer-presets">
     <Button variant="ghost" aria-pressed={(state.dentalSide??'left')==='left'} onClick={()=>setDentalSide('left')}>Left</Button>
     <Button variant="ghost" aria-pressed={state.dentalSide==='right'} onClick={()=>setDentalSide('right')}>Right</Button>
     <Button variant="ghost" aria-pressed={state.dentalSide==='both'} onClick={()=>setDentalSide('both')}>Both</Button>
    </div>
   )}

   <div className="layers-scroll">
    {/* Skeleton rows (Skeleton + Soft tissue / Muscles / Connective / Body surface) */}
    {showSkeletonRows && (
     <div className="stock-systems" aria-label="Skeleton & soft tissue systems">
      {activePill==='all' && <div className="system-column-label">Skeleton & Soft Tissue</div>}
      {skeletonSystems.map(s=>(
       <div className={`system-row ${state.visible.includes(s.id)?'enabled':''}`} key={s.id}>
        <Button variant="ghost" className="system-name" title={`Show only ${s.name.toLowerCase()}`} onClick={()=>setState(v=>{
         const l=applyLocks(v,'stock');
         const visible=l.visible.filter(x=>locks[x]);
         if(!visible.includes(s.id))visible.push(s.id);
         if(activePill==='all'){
          allSnapshotRef.current.visible=visible;
         }
         if(activePill==='skeleton'){
          skeletonVisibleRef.current=visible.filter(x=>SKELETON_SYSTEM_IDS.includes(x));
         }
         return {...l,visible,isolate:false,selected:[]};
        })}>
         <span className="system-dot" style={{background:s.color}}/><span className="system-label">{s.name}</span><span className="system-count">{counts[s.id]}</span>
        </Button>
        <div className="system-actions">
         <Switch checked={state.visible.includes(s.id)} onCheckedChange={()=>toggle(s.id)} aria-label={`Show ${s.name.toLowerCase()}`} />
         <Button variant="ghost" className={`lock-btn ${locks[s.id]?'locked':''}`} onClick={()=>toggleLock(s.id)} aria-label={locks[s.id]?'Unlock':'Lock'} title={locks[s.id]?'Unlock row':'Lock row'}>
          {locks[s.id]?<Lock size={13}/>:<Unlock size={13}/>}
         </Button>
        </div>
       </div>
      ))}
     </div>
    )}

    {/* Trigeminal rows */}
    {showTrigeminalRows && (
     <div className="overlay-layers" aria-label="Trigeminal overlay layers">
      {activePill==='all' && <div className="system-column-label">Trigeminal (CN V)</div>}
      
      {/* Base systems for Trigeminal: Skeleton & Body surface */}
      {activePill==='trigeminal' && trigeminalBaseSystems.map(s=>(
       <div className={`system-row ${state.visible.includes(s.id)?'enabled':''}`} key={s.id}>
        <Button variant="ghost" className="system-name" title={`Show only ${s.name.toLowerCase()}`} onClick={()=>setState(v=>{
         const l=applyLocks(v,'trigeminal');
         const visible=l.visible.filter(x=>locks[x]);
         if(!visible.includes(s.id))visible.push(s.id);
         if(activePill==='trigeminal'){
          trigeminalSnapshotRef.current.visible=visible;
         }
         return {...l,visible,isolate:false,selected:[]};
        })}>
         <span className="system-dot" style={{background:s.color}}/><span className="system-label">{s.name}</span><span className="system-count">{counts[s.id]}</span>
        </Button>
        <div className="system-actions">
         <Switch checked={state.visible.includes(s.id)} onCheckedChange={()=>toggle(s.id)} aria-label={`Show ${s.name.toLowerCase()}`} />
         <Button variant="ghost" className={`lock-btn ${locks[s.id]?'locked':''}`} onClick={()=>toggleLock(s.id)} aria-label={locks[s.id]?'Unlock':'Lock'} title={locks[s.id]?'Unlock row':'Lock row'}>
          {locks[s.id]?<Lock size={13}/>:<Unlock size={13}/>}
         </Button>
        </div>
       </div>
      ))}

      {/* CN V */}
      <div className={`system-row ${state.nervousLayers.cnv?'enabled':''}`}>
       <Button variant="ghost" className="system-name" title="Show or hide the yellow trigeminal tree" onClick={()=>patchNervousLayers({cnv:!state.nervousLayers.cnv})}>
        <span className="system-dot" style={{background:'#e6c445'}}/><span className="system-label">CN V</span><span className="layer-sub">yellow nerves</span>
       </Button>
       <div className="system-actions">
        <Switch checked={state.nervousLayers.cnv} onCheckedChange={on=>patchNervousLayers({cnv:on})} aria-label="Show trigeminal nerve" />
        <Button variant="ghost" className={`lock-btn ${locks['nervous_cnv']?'locked':''}`} onClick={()=>toggleLock('nervous_cnv')} aria-label={locks['nervous_cnv']?'Unlock':'Lock'} title={locks['nervous_cnv']?'Unlock row':'Lock row'}>
         {locks['nervous_cnv']?<Lock size={13}/>:<Unlock size={13}/>}
        </Button>
       </div>
      </div>

      {/* V1 */}
      <div className={`system-row ${state.nervousLayers.v1?'enabled':''}`}>
       <Button variant="ghost" className="system-name" title="Study ophthalmic V1 (forehead & eye)" onClick={()=>patchNervousLayers({v1:!state.nervousLayers.v1})}>
        <span className="system-dot" style={{background:'#2aa8b8'}}/><span className="system-label">V1</span><span className="layer-sub">forehead & eye</span>
       </Button>
       <div className="system-actions">
        <Switch checked={state.nervousLayers.v1} onCheckedChange={on=>patchNervousLayers({v1:on})} aria-label="Show ophthalmic V1" />
        <Button variant="ghost" className={`lock-btn ${locks['nervous_v1']?'locked':''}`} onClick={()=>toggleLock('nervous_v1')} aria-label={locks['nervous_v1']?'Unlock':'Lock'} title={locks['nervous_v1']?'Unlock row':'Lock row'}>
         {locks['nervous_v1']?<Lock size={13}/>:<Unlock size={13}/>}
        </Button>
       </div>
      </div>

      {/* V2 */}
      <div className={`system-row ${state.nervousLayers.v2?'enabled':''}`}>
       <Button variant="ghost" className="system-name" title="Study maxillary V2 (cheek & upper lip)" onClick={()=>patchNervousLayers({v2:!state.nervousLayers.v2})}>
        <span className="system-dot" style={{background:'#3daf6a'}}/><span className="system-label">V2</span><span className="layer-sub">cheek & upper lip</span>
       </Button>
       <div className="system-actions">
        <Switch checked={state.nervousLayers.v2} onCheckedChange={on=>patchNervousLayers({v2:on})} aria-label="Show maxillary V2" />
        <Button variant="ghost" className={`lock-btn ${locks['nervous_v2']?'locked':''}`} onClick={()=>toggleLock('nervous_v2')} aria-label={locks['nervous_v2']?'Unlock':'Lock'} title={locks['nervous_v2']?'Unlock row':'Lock row'}>
         {locks['nervous_v2']?<Lock size={13}/>:<Unlock size={13}/>}
        </Button>
       </div>
      </div>

      {/* V3 */}
      <div className={`system-row ${state.nervousLayers.v3Jaw||state.nervousLayers.v3Temple?'enabled':''}`}>
       <Button variant="ghost" className="system-name" title="Study mandibular V3" onClick={()=>patchNervousLayers({v3Jaw:!(state.nervousLayers.v3Jaw||state.nervousLayers.v3Temple),v3Temple:!(state.nervousLayers.v3Jaw||state.nervousLayers.v3Temple)})}>
        <span className="system-dot" style={{background:'#8a5bb8'}}/><span className="system-label">V3</span><span className="layer-sub">two skin areas</span>
       </Button>
       <div className="system-actions">
        <Switch checked={state.nervousLayers.v3Jaw||state.nervousLayers.v3Temple} onCheckedChange={on=>patchNervousLayers({v3Jaw:on,v3Temple:on})} aria-label="Show mandibular V3" />
        <Button variant="ghost" className={`lock-btn ${locks['nervous_v3']?'locked':''}`} onClick={()=>toggleLock('nervous_v3')} aria-label={locks['nervous_v3']?'Unlock':'Lock'} title={locks['nervous_v3']?'Unlock row':'Lock row'}>
         {locks['nervous_v3']?<Lock size={13}/>:<Unlock size={13}/>}
        </Button>
       </div>
      </div>

      {/* Indented Jaw & chin */}
      <div className={`system-row overlay-child ${state.nervousLayers.v3Jaw?'enabled':''}`}>
       <Button variant="ghost" className="system-name" title="Lower face: jaw, chin, lower lip" onClick={()=>patchNervousLayers({v3Jaw:!state.nervousLayers.v3Jaw})}>
        <span className="system-dot" style={{background:'#8a5bb8'}}/><span className="system-label">Jaw & chin</span>
       </Button>
       <div className="system-actions">
        <Switch checked={state.nervousLayers.v3Jaw} onCheckedChange={on=>patchNervousLayers({v3Jaw:on})} aria-label="Show V3 jaw and chin" />
        <Button variant="ghost" className={`lock-btn ${locks['nervous_v3Jaw']?'locked':''}`} onClick={()=>toggleLock('nervous_v3Jaw')} aria-label={locks['nervous_v3Jaw']?'Unlock':'Lock'} title={locks['nervous_v3Jaw']?'Unlock row':'Lock row'}>
         {locks['nervous_v3Jaw']?<Lock size={13}/>:<Unlock size={13}/>}
        </Button>
       </div>
      </div>

      {/* Indented Temple & ear */}
      <div className={`system-row overlay-child ${state.nervousLayers.v3Temple?'enabled':''}`}>
       <Button variant="ghost" className="system-name" title="Side of head: temple & ear" onClick={()=>patchNervousLayers({v3Temple:!state.nervousLayers.v3Temple})}>
        <span className="system-dot" style={{background:'#9b6cc9'}}/><span className="system-label">Temple & ear</span>
       </Button>
       <div className="system-actions">
        <Switch checked={state.nervousLayers.v3Temple} onCheckedChange={on=>patchNervousLayers({v3Temple:on})} aria-label="Show V3 temple and ear" />
        <Button variant="ghost" className={`lock-btn ${locks['nervous_v3Temple']?'locked':''}`} onClick={()=>toggleLock('nervous_v3Temple')} aria-label={locks['nervous_v3Temple']?'Unlock':'Lock'} title={locks['nervous_v3Temple']?'Unlock row':'Lock row'}>
         {locks['nervous_v3Temple']?<Lock size={13}/>:<Unlock size={13}/>}
        </Button>
       </div>
      </div>
     </div>
    )}

    {/* Face rows (Muscles + Soft tissue) */}
    {showFaceRows && (
     <div className="overlay-layers" aria-label="Face layers">
      {/* Base systems for Face: Skeleton & Body surface */}
      {faceBaseSystems.map(s=>(
       <div className={`system-row ${state.visible.includes(s.id)?'enabled':''}`} key={s.id}>
        <Button variant="ghost" className="system-name" title={`Show only ${s.name.toLowerCase()}`} onClick={()=>setState(v=>{
         const l=applyLocks(v,'face');
         const visible=l.visible.filter(x=>locks[x]);
         if(!visible.includes(s.id))visible.push(s.id);
         if(activePill==='face'){
          faceSnapshotRef.current.visible=visible;
         }
         return {...l,visible,isolate:false,selected:[]};
        })}>
         <span className="system-dot" style={{background:s.color}}/><span className="system-label">{s.name}</span><span className="system-count">{counts[s.id]}</span>
        </Button>
        <div className="system-actions">
         <Switch checked={state.visible.includes(s.id)} onCheckedChange={()=>toggle(s.id)} aria-label={`Show ${s.name.toLowerCase()}`} />
         <Button variant="ghost" className={`lock-btn ${locks[s.id]?'locked':''}`} onClick={()=>toggleLock(s.id)} aria-label={locks[s.id]?'Unlock':'Lock'} title={locks[s.id]?'Unlock row':'Lock row'}>
          {locks[s.id]?<Lock size={13}/>:<Unlock size={13}/>}
         </Button>
        </div>
       </div>
      ))}

      {/* Subsection: Muscles */}
      <div className="system-column-label">Muscles</div>
      {FACE_MUSCLE_ROWS.map(m=>(
       <div className={`system-row ${(state.faceMuscleLayers?.[m.id]??true)?'enabled':''}`} key={m.id}>
        <Button variant="ghost" className="system-name" title={m.description} onClick={()=>patchFaceMuscleLayers({[m.id]:!(state.faceMuscleLayers?.[m.id]??true)})}>
         <span className="system-dot" style={{background:m.color}}/><span className="system-label">{m.label}</span><span className="layer-sub">{m.sub}</span>
        </Button>
        <div className="system-actions">
         <Switch checked={state.faceMuscleLayers?.[m.id]??true} onCheckedChange={on=>patchFaceMuscleLayers({[m.id]:on})} aria-label={`Show ${m.label} muscle`} />
         <Button variant="ghost" className={`lock-btn ${locks['facemuscle_'+m.id]?'locked':''}`} onClick={()=>toggleLock('facemuscle_'+m.id)} aria-label={locks['facemuscle_'+m.id]?'Unlock':'Lock'} title={locks['facemuscle_'+m.id]?'Unlock row':'Lock row'}>
          {locks['facemuscle_'+m.id]?<Lock size={13}/>:<Unlock size={13}/>}
         </Button>
        </div>
       </div>
      ))}

      {/* Subsection: Soft tissue */}
      <div className="system-column-label">Soft tissue</div>
      
      {/* SMAS */}
      <div className={`system-row ${state.smasLayers?.smas?'enabled':''}`}>
       <Button variant="ghost" className="system-name" title="Superficial musculoaponeurotic system fascia" onClick={()=>patchSmasLayers({smas:!state.smasLayers?.smas})}>
        <span className="system-dot" style={{background:SMAS_COLOR}}/><span className="system-label">SMAS</span><span className="layer-sub">fascia</span>
       </Button>
       <div className="system-actions">
        <Switch checked={state.smasLayers?.smas??true} onCheckedChange={on=>patchSmasLayers({smas:on})} aria-label="Show SMAS fascia" />
        <Button variant="ghost" className={`lock-btn ${locks['smas_smas']?'locked':''}`} onClick={()=>toggleLock('smas_smas')} aria-label={locks['smas_smas']?'Unlock':'Lock'} title={locks['smas_smas']?'Unlock row':'Lock row'}>
         {locks['smas_smas']?<Lock size={13}/>:<Unlock size={13}/>}
        </Button>
       </div>
      </div>

      {/* Buccal fat pad */}
      <div className={`system-row ${state.smasLayers?.fat?'enabled':''}`}>
       <Button variant="ghost" className="system-name" title="Buccal and cheek fat pads" onClick={()=>patchSmasLayers({fat:!state.smasLayers?.fat})}>
        <span className="system-dot" style={{background:FAT_COLOR}}/><span className="system-label">Fat pad</span><span className="layer-sub">buccal pad</span>
       </Button>
       <div className="system-actions">
        <Switch checked={state.smasLayers?.fat??true} onCheckedChange={on=>patchSmasLayers({fat:on})} aria-label="Show fat pad" />
        <Button variant="ghost" className={`lock-btn ${locks['smas_fat']?'locked':''}`} onClick={()=>toggleLock('smas_fat')} aria-label={locks['smas_fat']?'Unlock':'Lock'} title={locks['smas_fat']?'Unlock row':'Lock row'}>
         {locks['smas_fat']?<Lock size={13}/>:<Unlock size={13}/>}
        </Button>
       </div>
      </div>

      {/* Facial nerve (CN VII) parent row */}
      {(() => {
       const cn7Active = !!(state.smasLayers?.temporal || state.smasLayers?.zygomatic || state.smasLayers?.buccal || state.smasLayers?.marginal || state.smasLayers?.cervical);
       return (
        <div className={`system-row ${cn7Active?'enabled':''}`}>
         <Button variant="ghost" className="system-name" title="Study facial nerve (CN VII) motor branches" onClick={()=>patchSmasLayers({temporal:!cn7Active,zygomatic:!cn7Active,buccal:!cn7Active,marginal:!cn7Active,cervical:!cn7Active})}>
          <span className="system-dot" style={{background:FACIAL_NERVE_COLOR}}/><span className="system-label">CN VII</span><span className="layer-sub">motor branches</span>
         </Button>
         <div className="system-actions">
          <Switch checked={cn7Active} onCheckedChange={on=>patchSmasLayers({temporal:on,zygomatic:on,buccal:on,marginal:on,cervical:on})} aria-label="Show facial nerve" />
          <Button variant="ghost" className={`lock-btn ${locks['smas_cn7']?'locked':''}`} onClick={()=>toggleLock('smas_cn7')} aria-label={locks['smas_cn7']?'Unlock':'Lock'} title={locks['smas_cn7']?'Unlock row':'Lock row'}>
           {locks['smas_cn7']?<Lock size={13}/>:<Unlock size={13}/>}
          </Button>
         </div>
        </div>
       );
      })()}

      {/* CN VII branch child rows */}
      {FACIAL_NERVE_ROWS.map(n=>(
       <div className={`system-row overlay-child ${state.smasLayers?.[n.id]?'enabled':''}`} key={n.id}>
        <Button variant="ghost" className="system-name" title={`CN VII ${n.label.toLowerCase()} branch (${n.sub})`} onClick={()=>patchSmasLayers({[n.id]:!state.smasLayers?.[n.id]})}>
         <span className="system-dot" style={{background:FACIAL_NERVE_COLOR}}/><span className="system-label">{n.label}</span><span className="layer-sub">{n.sub}</span>
        </Button>
        <div className="system-actions">
         <Switch checked={state.smasLayers?.[n.id]??true} onCheckedChange={on=>patchSmasLayers({[n.id]:on})} aria-label={`Show ${n.label} branch`} />
         <Button variant="ghost" className={`lock-btn ${locks['smas_'+n.id]?'locked':''}`} onClick={()=>toggleLock('smas_'+n.id)} aria-label={locks['smas_'+n.id]?'Unlock':'Lock'} title={locks['smas_'+n.id]?'Unlock row':'Lock row'}>
          {locks['smas_'+n.id]?<Lock size={13}/>:<Unlock size={13}/>}
         </Button>
        </div>
       </div>
      ))}

      {/* Deep tissues: Parotid, Lymph, Periosteum */}
      <div className={`system-row ${state.smasLayers?.parotid?'enabled':''}`}>
       <Button variant="ghost" className="system-name" title="Parotid salivary gland" onClick={()=>patchSmasLayers({parotid:!state.smasLayers?.parotid})}>
        <span className="system-dot" style={{background:PAROTID_COLOR}}/><span className="system-label">Parotid</span><span className="layer-sub">gland</span>
       </Button>
       <div className="system-actions">
        <Switch checked={state.smasLayers?.parotid??true} onCheckedChange={on=>patchSmasLayers({parotid:on})} aria-label="Show parotid gland" />
        <Button variant="ghost" className={`lock-btn ${locks['smas_parotid']?'locked':''}`} onClick={()=>toggleLock('smas_parotid')} aria-label={locks['smas_parotid']?'Unlock':'Lock'} title={locks['smas_parotid']?'Unlock row':'Lock row'}>
         {locks['smas_parotid']?<Lock size={13}/>:<Unlock size={13}/>}
        </Button>
       </div>
      </div>

      <div className={`system-row ${state.smasLayers?.lymph?'enabled':''}`}>
       <Button variant="ghost" className="system-name" title="Facial and neck lymph nodes" onClick={()=>patchSmasLayers({lymph:!state.smasLayers?.lymph})}>
        <span className="system-dot" style={{background:LYMPH_COLOR}}/><span className="system-label">Lymph nodes</span><span className="layer-sub">face & neck</span>
       </Button>
       <div className="system-actions">
        <Switch checked={state.smasLayers?.lymph??true} onCheckedChange={on=>patchSmasLayers({lymph:on})} aria-label="Show lymph nodes" />
        <Button variant="ghost" className={`lock-btn ${locks['smas_lymph']?'locked':''}`} onClick={()=>toggleLock('smas_lymph')} aria-label={locks['smas_lymph']?'Unlock':'Lock'} title={locks['smas_lymph']?'Unlock row':'Lock row'}>
         {locks['smas_lymph']?<Lock size={13}/>:<Unlock size={13}/>}
        </Button>
       </div>
      </div>

      <div className={`system-row ${state.smasLayers?.periosteum?'enabled':''}`}>
       <Button variant="ghost" className="system-name" title="Periosteum fibrous film over bone" onClick={()=>patchSmasLayers({periosteum:!state.smasLayers?.periosteum})}>
        <span className="system-dot" style={{background:PERIOSTEUM_COLOR}}/><span className="system-label">Periosteum</span><span className="layer-sub">on bone</span>
       </Button>
       <div className="system-actions">
        <Switch checked={state.smasLayers?.periosteum??true} onCheckedChange={on=>patchSmasLayers({periosteum:on})} aria-label="Show periosteum" />
        <Button variant="ghost" className={`lock-btn ${locks['smas_periosteum']?'locked':''}`} onClick={()=>toggleLock('smas_periosteum')} aria-label={locks['smas_periosteum']?'Unlock':'Lock'} title={locks['smas_periosteum']?'Unlock row':'Lock row'}>
         {locks['smas_periosteum']?<Lock size={13}/>:<Unlock size={13}/>}
        </Button>
       </div>
      </div>
     </div>
    )}

     {/* Dental rows (Base + Jaw groups + Quadrants + Types) */}
     {showDentalRows && (
      <div className="overlay-layers" aria-label="Dental layers">
       {activePill === 'all' && <div className="system-column-label">Dentition & Jaws</div>}

       {/* Base systems for Dental: Skeleton & Body surface */}
       {activePill === 'dental' && dentalBaseSystems.map(s => (
        <div className={`system-row ${state.visible.includes(s.id) ? 'enabled' : ''}`} key={s.id}>
         <Button variant="ghost" className="system-name" title={`Show only ${s.name.toLowerCase()}`} onClick={() => setState(v => {
          const l = applyLocks(v, 'dental');
          const visible = l.visible.filter(x => locks[x]);
          if (!visible.includes(s.id)) visible.push(s.id);
          if (activePill === 'dental') {
           dentalSnapshotRef.current.visible = visible;
          }
          return { ...l, visible, isolate: false, selected: [] };
         })}>
          <span className="system-dot" style={{ background: s.color }} /><span className="system-label">{s.name}</span><span className="system-count">{counts[s.id]}</span>
         </Button>
         <div className="system-actions">
          <Switch checked={state.visible.includes(s.id)} onCheckedChange={() => toggle(s.id)} aria-label={`Show ${s.name.toLowerCase()}`} />
          <Button variant="ghost" className={`lock-btn ${locks[s.id] ? 'locked' : ''}`} onClick={() => toggleLock(s.id)} aria-label={locks[s.id] ? 'Unlock' : 'Lock'} title={locks[s.id] ? 'Unlock row' : 'Lock row'}>
           {locks[s.id] ? <Lock size={13} /> : <Unlock size={13} />}
          </Button>
         </div>
        </div>
       ))}

       {/* Subsection: Jaw groups */}
       <div className="system-column-label">Jaw groups</div>

       {/* Upper jaw */}
       <div className={`system-row ${(state.dentalLayers?.upperJaw ?? true) ? 'enabled' : ''}`}>
        <Button variant="ghost" className="system-name" title="Maxillae bones forming the upper jaw, palate, and upper gingiva" onClick={() => patchDentalLayers({ upperJaw: !(state.dentalLayers?.upperJaw ?? true) })}>
         <span className="system-dot" style={{ background: '#e5dec9' }} /><span className="system-label">Upper jaw</span><span className="layer-sub">maxilla & gingiva</span>
        </Button>
        <div className="system-actions">
         <Switch checked={state.dentalLayers?.upperJaw ?? true} onCheckedChange={on => patchDentalLayers({ upperJaw: on })} aria-label="Show upper jaw" />
         <Button variant="ghost" className={`lock-btn ${locks['dental_upperJaw'] ? 'locked' : ''}`} onClick={() => toggleLock('dental_upperJaw')} aria-label={locks['dental_upperJaw'] ? 'Unlock' : 'Lock'} title={locks['dental_upperJaw'] ? 'Unlock row' : 'Lock row'}>
          {locks['dental_upperJaw'] ? <Lock size={13} /> : <Unlock size={13} />}
         </Button>
        </div>
       </div>

       {/* Lower jaw */}
       <div className={`system-row ${(state.dentalLayers?.lowerJaw ?? true) ? 'enabled' : ''}`}>
        <Button variant="ghost" className="system-name" title="Mandible bone forming the lower jaw and lower gingiva" onClick={() => patchDentalLayers({ lowerJaw: !(state.dentalLayers?.lowerJaw ?? true) })}>
         <span className="system-dot" style={{ background: '#ded5be' }} /><span className="system-label">Lower jaw</span><span className="layer-sub">mandible & gingiva</span>
        </Button>
        <div className="system-actions">
         <Switch checked={state.dentalLayers?.lowerJaw ?? true} onCheckedChange={on => patchDentalLayers({ lowerJaw: on })} aria-label="Show lower jaw" />
         <Button variant="ghost" className={`lock-btn ${locks['dental_lowerJaw'] ? 'locked' : ''}`} onClick={() => toggleLock('dental_lowerJaw')} aria-label={locks['dental_lowerJaw'] ? 'Unlock' : 'Lock'} title={locks['dental_lowerJaw'] ? 'Unlock row' : 'Lock row'}>
          {locks['dental_lowerJaw'] ? <Lock size={13} /> : <Unlock size={13} />}
         </Button>
        </div>
       </div>

       {/* Teeth */}
       <div className={`system-row ${(state.dentalLayers?.teeth ?? true) ? 'enabled' : ''}`}>
        <Button variant="ghost" className="system-name" title="32 adult secondary teeth anchored in the alveolar processes of maxilla and mandible" onClick={() => patchDentalLayers({ teeth: !(state.dentalLayers?.teeth ?? true) })}>
         <span className="system-dot" style={{ background: '#38bdf8' }} /><span className="system-label">Teeth</span><span className="layer-sub">32 teeth</span>
        </Button>
        <div className="system-actions">
         <Switch checked={state.dentalLayers?.teeth ?? true} onCheckedChange={on => patchDentalLayers({ teeth: on })} aria-label="Show teeth" />
         <Button variant="ghost" className={`lock-btn ${locks['dental_teeth'] ? 'locked' : ''}`} onClick={() => toggleLock('dental_teeth')} aria-label={locks['dental_teeth'] ? 'Unlock' : 'Lock'} title={locks['dental_teeth'] ? 'Unlock row' : 'Lock row'}>
          {locks['dental_teeth'] ? <Lock size={13} /> : <Unlock size={13} />}
         </Button>
        </div>
       </div>

       {/* Subsection: Quadrants */}
       <div className="system-column-label">Quadrants</div>

       {/* Q1 upper right */}
       <div className={`system-row ${(state.dentalLayers?.q1 ?? true) ? 'enabled' : ''}`}>
        <Button variant="ghost" className="system-name" title="Quadrant 1: Maxillary upper right quadrant (8 teeth: incisors to 3rd molar)" onClick={() => patchDentalLayers({ q1: !(state.dentalLayers?.q1 ?? true) })}>
         <span className="system-dot" style={{ background: DENTAL_QUADRANT_COLORS.q1 }} /><span className="system-label">Q1 upper right</span><span className="layer-sub">8 teeth</span>
        </Button>
        <div className="system-actions">
         <Switch checked={state.dentalLayers?.q1 ?? true} onCheckedChange={on => patchDentalLayers({ q1: on })} aria-label="Show Q1 upper right" />
         <Button variant="ghost" className={`lock-btn ${locks['dental_q1'] ? 'locked' : ''}`} onClick={() => toggleLock('dental_q1')} aria-label={locks['dental_q1'] ? 'Unlock' : 'Lock'} title={locks['dental_q1'] ? 'Unlock row' : 'Lock row'}>
          {locks['dental_q1'] ? <Lock size={13} /> : <Unlock size={13} />}
         </Button>
        </div>
       </div>

       {/* Q2 upper left */}
       <div className={`system-row ${(state.dentalLayers?.q2 ?? true) ? 'enabled' : ''}`}>
        <Button variant="ghost" className="system-name" title="Quadrant 2: Maxillary upper left quadrant (8 teeth: incisors to 3rd molar)" onClick={() => patchDentalLayers({ q2: !(state.dentalLayers?.q2 ?? true) })}>
         <span className="system-dot" style={{ background: DENTAL_QUADRANT_COLORS.q2 }} /><span className="system-label">Q2 upper left</span><span className="layer-sub">8 teeth</span>
        </Button>
        <div className="system-actions">
         <Switch checked={state.dentalLayers?.q2 ?? true} onCheckedChange={on => patchDentalLayers({ q2: on })} aria-label="Show Q2 upper left" />
         <Button variant="ghost" className={`lock-btn ${locks['dental_q2'] ? 'locked' : ''}`} onClick={() => toggleLock('dental_q2')} aria-label={locks['dental_q2'] ? 'Unlock' : 'Lock'} title={locks['dental_q2'] ? 'Unlock row' : 'Lock row'}>
          {locks['dental_q2'] ? <Lock size={13} /> : <Unlock size={13} />}
         </Button>
        </div>
       </div>

       {/* Q3 lower left */}
       <div className={`system-row ${(state.dentalLayers?.q3 ?? true) ? 'enabled' : ''}`}>
        <Button variant="ghost" className="system-name" title="Quadrant 3: Mandibular lower left quadrant (8 teeth: incisors to 3rd molar)" onClick={() => patchDentalLayers({ q3: !(state.dentalLayers?.q3 ?? true) })}>
         <span className="system-dot" style={{ background: DENTAL_QUADRANT_COLORS.q3 }} /><span className="system-label">Q3 lower left</span><span className="layer-sub">8 teeth</span>
        </Button>
        <div className="system-actions">
         <Switch checked={state.dentalLayers?.q3 ?? true} onCheckedChange={on => patchDentalLayers({ q3: on })} aria-label="Show Q3 lower left" />
         <Button variant="ghost" className={`lock-btn ${locks['dental_q3'] ? 'locked' : ''}`} onClick={() => toggleLock('dental_q3')} aria-label={locks['dental_q3'] ? 'Unlock' : 'Lock'} title={locks['dental_q3'] ? 'Unlock row' : 'Lock row'}>
          {locks['dental_q3'] ? <Lock size={13} /> : <Unlock size={13} />}
         </Button>
        </div>
       </div>

       {/* Q4 lower right */}
       <div className={`system-row ${(state.dentalLayers?.q4 ?? true) ? 'enabled' : ''}`}>
        <Button variant="ghost" className="system-name" title="Quadrant 4: Mandibular lower right quadrant (8 teeth: incisors to 3rd molar)" onClick={() => patchDentalLayers({ q4: !(state.dentalLayers?.q4 ?? true) })}>
         <span className="system-dot" style={{ background: DENTAL_QUADRANT_COLORS.q4 }} /><span className="system-label">Q4 lower right</span><span className="layer-sub">8 teeth</span>
        </Button>
        <div className="system-actions">
         <Switch checked={state.dentalLayers?.q4 ?? true} onCheckedChange={on => patchDentalLayers({ q4: on })} aria-label="Show Q4 lower right" />
         <Button variant="ghost" className={`lock-btn ${locks['dental_q4'] ? 'locked' : ''}`} onClick={() => toggleLock('dental_q4')} aria-label={locks['dental_q4'] ? 'Unlock' : 'Lock'} title={locks['dental_q4'] ? 'Unlock row' : 'Lock row'}>
          {locks['dental_q4'] ? <Lock size={13} /> : <Unlock size={13} />}
         </Button>
        </div>
       </div>

       {/* Subsection: Types */}
       <div className="system-column-label">Types</div>

       {/* Incisor */}
       <div className={`system-row ${(state.dentalLayers?.incisor ?? true) ? 'enabled' : ''}`}>
        <Button variant="ghost" className="system-name" title="8 incisor teeth (4 central, 4 lateral) for cutting and shearing food" onClick={() => patchDentalLayers({ incisor: !(state.dentalLayers?.incisor ?? true) })}>
         <span className="system-dot" style={{ background: DENTAL_TYPE_COLORS.incisor }} /><span className="system-label">Incisor</span><span className="layer-sub">8 teeth</span>
        </Button>
        <div className="system-actions">
         <Switch checked={state.dentalLayers?.incisor ?? true} onCheckedChange={on => patchDentalLayers({ incisor: on })} aria-label="Show incisor teeth" />
         <Button variant="ghost" className={`lock-btn ${locks['dental_incisor'] ? 'locked' : ''}`} onClick={() => toggleLock('dental_incisor')} aria-label={locks['dental_incisor'] ? 'Unlock' : 'Lock'} title={locks['dental_incisor'] ? 'Unlock row' : 'Lock row'}>
          {locks['dental_incisor'] ? <Lock size={13} /> : <Unlock size={13} />}
         </Button>
        </div>
       </div>

       {/* Canine */}
       <div className={`system-row ${(state.dentalLayers?.canine ?? true) ? 'enabled' : ''}`}>
        <Button variant="ghost" className="system-name" title="4 canine teeth (cuspids) for tearing food" onClick={() => patchDentalLayers({ canine: !(state.dentalLayers?.canine ?? true) })}>
         <span className="system-dot" style={{ background: DENTAL_TYPE_COLORS.canine }} /><span className="system-label">Canine</span><span className="layer-sub">4 teeth</span>
        </Button>
        <div className="system-actions">
         <Switch checked={state.dentalLayers?.canine ?? true} onCheckedChange={on => patchDentalLayers({ canine: on })} aria-label="Show canine teeth" />
         <Button variant="ghost" className={`lock-btn ${locks['dental_canine'] ? 'locked' : ''}`} onClick={() => toggleLock('dental_canine')} aria-label={locks['dental_canine'] ? 'Unlock' : 'Lock'} title={locks['dental_canine'] ? 'Unlock row' : 'Lock row'}>
          {locks['dental_canine'] ? <Lock size={13} /> : <Unlock size={13} />}
         </Button>
        </div>
       </div>

       {/* Premolar */}
       <div className={`system-row ${(state.dentalLayers?.premolar ?? true) ? 'enabled' : ''}`}>
        <Button variant="ghost" className="system-name" title="8 premolar teeth (bicuspids) for crushing food" onClick={() => patchDentalLayers({ premolar: !(state.dentalLayers?.premolar ?? true) })}>
         <span className="system-dot" style={{ background: DENTAL_TYPE_COLORS.premolar }} /><span className="system-label">Premolar</span><span className="layer-sub">8 teeth</span>
        </Button>
        <div className="system-actions">
         <Switch checked={state.dentalLayers?.premolar ?? true} onCheckedChange={on => patchDentalLayers({ premolar: on })} aria-label="Show premolar teeth" />
         <Button variant="ghost" className={`lock-btn ${locks['dental_premolar'] ? 'locked' : ''}`} onClick={() => toggleLock('dental_premolar')} aria-label={locks['dental_premolar'] ? 'Unlock' : 'Lock'} title={locks['dental_premolar'] ? 'Unlock row' : 'Lock row'}>
          {locks['dental_premolar'] ? <Lock size={13} /> : <Unlock size={13} />}
         </Button>
        </div>
       </div>

       {/* Molar */}
       <div className={`system-row ${(state.dentalLayers?.molar ?? true) ? 'enabled' : ''}`}>
        <Button variant="ghost" className="system-name" title="12 molar teeth (1st, 2nd, and 3rd wisdom molars) for chewing and grinding food" onClick={() => patchDentalLayers({ molar: !(state.dentalLayers?.molar ?? true) })}>
         <span className="system-dot" style={{ background: DENTAL_TYPE_COLORS.molar }} /><span className="system-label">Molar</span><span className="layer-sub">12 teeth</span>
        </Button>
        <div className="system-actions">
         <Switch checked={state.dentalLayers?.molar ?? true} onCheckedChange={on => patchDentalLayers({ molar: on })} aria-label="Show molar teeth" />
         <Button variant="ghost" className={`lock-btn ${locks['dental_molar'] ? 'locked' : ''}`} onClick={() => toggleLock('dental_molar')} aria-label={locks['dental_molar'] ? 'Unlock' : 'Lock'} title={locks['dental_molar'] ? 'Unlock row' : 'Lock row'}>
          {locks['dental_molar'] ? <Lock size={13} /> : <Unlock size={13} />}
         </Button>
        </div>
       </div>
      </div>
     )}

    {/* Organ rows */}
    {showOrganRows && (
     <div className="stock-systems" aria-label="Organ systems">
      {activePill==='all' && <div className="system-column-label">Organs & viscera</div>}
      {organSystems.map(s=>(
       <div className={`system-row ${state.visible.includes(s.id)?'enabled':''}`} key={s.id}>
        <Button variant="ghost" className="system-name" title={`Show only ${s.name.toLowerCase()}`} onClick={()=>setState(v=>{
         const l=applyLocks(v,'stock');
         const visible=l.visible.filter(x=>locks[x]);
         if(!visible.includes(s.id))visible.push(s.id);
         if(activePill==='all'){
          allSnapshotRef.current.visible=visible;
         }
         if(activePill==='organs'){
          organsVisibleRef.current=visible.filter(x=>ORGAN_SYSTEM_IDS.includes(x));
         }
         return {...l,visible,isolate:false,selected:[]};
        })}>
         <span className="system-dot" style={{background:s.color}}/><span className="system-label">{s.name}</span><span className="system-count">{counts[s.id]}</span>
        </Button>
        <div className="system-actions">
         <Switch checked={state.visible.includes(s.id)} onCheckedChange={()=>toggle(s.id)} aria-label={`Show ${s.name.toLowerCase()}`} />
         <Button variant="ghost" className={`lock-btn ${locks[s.id]?'locked':''}`} onClick={()=>toggleLock(s.id)} aria-label={locks[s.id]?'Unlock':'Lock'} title={locks[s.id]?'Unlock row':'Lock row'}>
          {locks[s.id]?<Lock size={13}/>:<Unlock size={13}/>}
         </Button>
        </div>
       </div>
      ))}
     </div>
    )}
   </div>

   <div className="panel-foot">
    <span>{visibleCount.toLocaleString()} pieces visible</span>
    <div style={{display:'flex',gap:'4px',alignItems:'center'}}>
     <Button variant="ghost" onClick={lockAllCurrent} title="Lock all current rows">Lock all</Button>
     {lockCount > 0 ? (
      <Button variant="ghost" className="unlock-all-btn" onClick={unlockAll}>Unlock all ({lockCount})</Button>
      ) : (
       <Button variant="ghost" onClick={()=>{
        if(activePill==='all'){
         allSnapshotRef.current.visible=[];
         allSnapshotRef.current.nervousLayers={
          cnv:false,v1:false,v2:false,v3Jaw:false,v3Temple:false
         };
        }
        if(activePill==='skeleton'){
         skeletonVisibleRef.current=[];
        }
        if(activePill==='trigeminal'){
         trigeminalSnapshotRef.current.visible=[];
        }
        if(activePill==='face'){
         faceSnapshotRef.current.visible=[];
         faceSnapshotRef.current.smasLayers={
          smas:false,fat:false,temporal:false,zygomatic:false,buccal:false,marginal:false,cervical:false,parotid:false,lymph:false,periosteum:false
         };
         faceSnapshotRef.current.faceMuscleLayers={
          masseter:false,temporalis:false,buccinator:false,orbicularis:false,zygomaticus:false,pterygoids:false
         };
        }
        if(activePill==='dental'){
         dentalSnapshotRef.current.visible=[];
         dentalSnapshotRef.current.dentalLayers={
          upperJaw:false,lowerJaw:false,teeth:false,
          q1:false,q2:false,q3:false,q4:false,
          incisor:false,canine:false,premolar:false,molar:false
         };
        }
        if(activePill==='organs'){
         organsVisibleRef.current=[];
        }
        setState(s=>({...s,visible:[],selected:[],isolate:false,nervousOverlay:false,smasOverlay:false,dentalOverlay:false,faceMuscleLayers:{masseter:false,temporalis:false,buccinator:false,orbicularis:false,zygomaticus:false,pterygoids:false},dentalLayers:{upperJaw:false,lowerJaw:false,teeth:false,q1:false,q2:false,q3:false,q4:false,incisor:false,canine:false,premolar:false,molar:false}}));
       }}>Hide all</Button>
      )}
    </div>
   </div>
  </section>

  {panel==='search'&&<section className="search-panel glass" aria-label="Find anatomy">
   <div className="panel-heading"><span>Find a structure</span><Button variant="ghost" className="icon-button" onClick={()=>setPanel(null)} aria-label="Close search"><X size={18}/></Button></div>
   <Combobox<Concept> items={results} value={null} onValueChange={value=>{if(value)choose(value);}} inputValue={query} onInputValueChange={setQuery} itemToStringLabel={c=>c.name} filter={null} open onOpenChange={open=>{if(!open)setPanel(null);}}><ComboboxInput autoFocus placeholder="Heart, femur, cranial nerve…" aria-label="Search named anatomical structures" showTrigger={false}/><ComboboxContent className="anatomy-search-results"><ComboboxEmpty>No structures match your search.</ComboboxEmpty><ComboboxList>{(c:Concept)=><ComboboxItem key={c.id} value={c}><span className="search-result-name">{c.name}</span><span className="small-number">{c.elements.length} {c.elements.length===1?'piece':'pieces'}</span></ComboboxItem>}</ComboboxList></ComboboxContent></Combobox>
   <p className="search-note">{query?'Showing up to 80 matches. Refine your search to find smaller structures.':'Start with a major organ, or search every named structure.'}</p>
  </section>}

   {/* Commented out to free up space: View controls toolbar */}
   {/* <nav className="view-controls glass" aria-label="Camera controls">
    {(['three-quarter','front','side','back'] as View[]).map((v,i)=>(
     <Button variant="ghost" key={v} className={state.view===v?'active':''} aria-pressed={state.view===v} disabled={state.explode>.8&&v!=='front'} onClick={()=>setState(s=>({...s,view:v,reset:s.reset+1,rotate:false}))} title={`${v} view`} aria-label={`${v} view`}>
      <span>{['¾','F','S','B'][i]}</span>
     </Button>
    ))}
    <i/>
    <Button variant="ghost" disabled={state.explode>=.4} aria-label={state.rotate?'Pause rotation':'Rotate body'} title="Auto rotate" className={state.rotate?'active':''} onClick={()=>setState(s=>({...s,rotate:!s.rotate}))}>
     {state.rotate?<Pause size={17}/>:<RotateCw size={18}/>}
    </Button>
    <Button variant="ghost" aria-label="Reset view and layers" title="Reset" onClick={reset}>
     <RotateCcw size={17}/></Button>
   </nav> */}

  <div className="scene-caption">
   <span className="caption-line"/>
   <span>{state.smasOverlay&&activePill==='face'?'FACIAL SOFT TISSUE & MUSCLES · TEACHING OVERLAY':state.nervousOverlay&&activePill==='trigeminal'?'TRIGEMINAL NERVE (CN V) · TEACHING OVERLAY':state.isolate?(chosen?.name??'SELECTED STRUCTURE'):state.explode>.95?'ANATOMICAL INVENTORY':state.explode>.05?'SEPARATED STRUCTURES':'ADULT HUMAN · MALE'}</span>
   <span className="caption-line"/>
  </div>

   {/* Commented out to free up space: Explode anatomy bottom dock */}
   {/* <div className="bottom-dock glass">
    <Button variant="ghost" className="mobile-only dock-layers" onClick={()=>openPanel('layers')} aria-label="Open system layers">
     <Layers3 size={20}/><span>Systems</span>
    </Button>
    <div className="explode-control">
     <div className="explode-label"><label id="explode-label">Explode anatomy</label><output>{Math.round(state.explode*100)}<span>%</span></output></div>
     <Slider aria-labelledby="explode-label" min={0} max={100} step={1} value={[state.explode*100]} onValueChange={v=>setState(s=>({...s,explode:(Array.isArray(v)?v[0]:v)/100,view:(Array.isArray(v)?v[0]:v)>80?'front':s.view,rotate:false}))}/>
     <div className="slider-endpoints"><span>Assembled</span><span>Every piece</span></div>
    </div>
    <Button variant="ghost" className="dock-reset" onClick={reset} aria-label="Assemble and reset"><RotateCcw size={18}/><span>Reset</span></Button>
   </div> */}

  <footer className="studio-footer">
   <span>{state.explode>.8?'Drag to pan':'Drag to orbit'} <b>·</b> Pinch to zoom <b>·</b> Tap to inspect</span>
   <Button variant="ghost" onClick={()=>{setDetails(false);setPanel(null);setAbout(true);}}>Source & credits <ArrowUpRight size={12}/></Button>
  </footer>

  {progress<100&&!error&&<div className="loading glass" role="status"><Activity size={18}/><div><strong>Preparing the anatomy</strong><span>{progress}% · Loading {atlas?.parts.length.toLocaleString()??'2,234'} pieces</span><div className="loading-track"><i style={{width:`${progress}%`}}/></div></div></div>}
  {error&&<div className="loading glass error" role="alert"><p>{error}</p><Button variant="ghost" onClick={()=>location.reload()}>Reload viewer</Button></div>}

  {/* Detail Inspector Sheet for Mesh, Trigeminal, or SMAS Element */}
  <Sheet open={details&&(selectedParts.length>0||!!nervousDetail||!!smasDetail)} modal={false} disablePointerDismissal onOpenChange={setDetails}>
   <SheetContent initialFocus={detailTitle} className={`detail-sheet glass ${state.isolate?'is-isolated':''}`} showCloseButton={true}>
    {smasDetail ? (
     <>
      <div className="detail-header">
       <div className="detail-accent" style={{background:smasDetail.accent}}/>
       <div className="eyebrow">{smasDetail.eyebrow} · {smasDetail.face}</div>
       <SheetTitle ref={detailTitle} tabIndex={-1} className="structure-title">{smasDetail.title}</SheetTitle>
      </div>
      <div className="detail-scroll">
       <SheetDescription className="structure-description">{smasDetail.blurb}</SheetDescription>
       <span className="context-note">Teaching overlay · Facial soft tissue layers</span>
      </div>
      <div className="detail-actions">
       <Button variant="ghost" className="secondary-action" onClick={()=>{setState(s=>({...s,smasSelection:null}));setDetails(false);}}>Close</Button>
      </div>
     </>
    ) : nervousDetail ? (
     <>
      <div className="detail-header">
       <div className="detail-accent" style={{background:nervousDetail.accent}}/>
       <div className="eyebrow">{nervousDetail.eyebrow} · {nervousDetail.face}</div>
       <SheetTitle ref={detailTitle} tabIndex={-1} className="structure-title">{nervousDetail.title}</SheetTitle>
      </div>
      <div className="detail-scroll">
       <SheetDescription className="structure-description">{nervousDetail.blurb}</SheetDescription>
       <span className="context-note">Teaching overlay · 3D geometric annotation of cranial nerve V</span>
      </div>
      <div className="detail-actions">
       <Button variant="ghost" className="secondary-action" onClick={()=>{setState(s=>({...s,nervousSelection:null}));setDetails(false);}}>Close</Button>
      </div>
     </>
    ) : (
     <>
      <div className="detail-header">
       <div className="detail-accent" style={{background:system?.color}}/>
       <div className="eyebrow">{system?.name??'ANATOMY'}</div>
       <SheetTitle ref={detailTitle} tabIndex={-1} className="structure-title">{chosen?.name}</SheetTitle>
      </div>
      <div className="detail-scroll" key={`${chosen?.id}-${state.isolate}`}>
       <SheetDescription className="structure-description">{chosen&&selected?explanation(chosen.name,selected.system):''}</SheetDescription>
       {chosen&&!EXPLANATIONS[chosen.name.toLowerCase()]&&<span className="context-note">System overview · structure identified from source anatomy</span>}
       <div className="structure-meta">
        <span>Atlas reference<strong>{chosen?.id}</strong></span>
        <span>Selected pieces<strong>{state.selected.length.toLocaleString()}</strong></span>
       </div>
       {selectedParts.length>1&&<div className="member-list">
        <h3>Included structures</h3>
        {selectedParts.slice(0,50).map(p=><Button variant="ghost" key={p.id} onClick={()=>choosePart(p.id)}><span>{p.name}</span><ChevronRight size={14}/></Button>)}
        {selectedParts.length>50&&<p>And {selectedParts.length-50} more modeled pieces.</p>}
       </div>}
       <a className="source-link" href="https://lifesciencedb.jp/bp3d/" target="_blank" rel="noreferrer">View anatomical source <ArrowUpRight size={14}/></a>
      </div>
      <div className="detail-actions">
       <Button className={`primary-action ${state.isolate?'active':''}`} onClick={()=>setState(s=>({...s,isolate:!s.isolate,explode:0}))}>
        <Focus size={18}/>{state.isolate?'Show surrounding anatomy':'Isolate structure'}<ChevronRight size={16}/>
       </Button>
       <Button variant="ghost" className="secondary-action" onClick={()=>{setState(s=>({...s,selected:[],isolate:false}));setDetails(false);}}>Clear selection</Button>
      </div>
     </>
    )}
   </SheetContent>
  </Sheet>

  <Sheet open={about} onOpenChange={setAbout}>
   <SheetContent className="about-sheet glass">
    <div className="eyebrow">SOURCE & SCOPE</div>
    <SheetTitle className="structure-title">A body, revealed.</SheetTitle>
    <SheetDescription>Explore the adult male reference anatomy from BodyParts3D.</SheetDescription>
    <div className="about-copy">
     <p><strong>Male · BodyParts3D</strong><br/>2,234 individual meshes and 3,432 named concepts from an adult male reference anatomy.</p>
     <p>This reference does not contain every human structure or variation. Named concepts can contain multiple pieces; each source mesh is rendered once.</p>
     <p>Colors and system groupings are designed for exploration. The geometry is simplified for the web, and short explanations provide general educational context. This is an educational reference, not a diagnostic or surgical tool.</p>
     <h3>Source</h3>
     <p>BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.</p>
     <a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html" target="_blank" rel="noreferrer">Dataset license <ArrowUpRight size={14}/></a>
     <a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html" target="_blank" rel="noreferrer">Original geometry & metadata <ArrowUpRight size={14}/></a>
     <a href="https://academic.oup.com/nar/article/37/suppl_1/D782/1000752" target="_blank" rel="noreferrer">Read the source publication <ArrowUpRight size={14}/></a>
    </div>
   </SheetContent>
  </Sheet>
 </main>;
}
