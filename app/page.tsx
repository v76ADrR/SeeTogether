import {flushSync} from 'react-dom';
import {registerAtlasTools} from './agent-tools';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Activity,ArrowUpRight,ChevronRight,Focus,Info,Layers3,Pause,RotateCcw,RotateCw,Search,X} from 'lucide-react';
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
 SKELETON_SYSTEM_IDS,
 ORGAN_SYSTEM_IDS,
 DEFAULT_NERVOUS_LAYERS,
 DEFAULT_NERVOUS_SIDE,
 SYSTEMS,
 EXPLANATIONS,
 explanation,
 type Atlas,
 type Concept,
 type SceneState,
 type SystemId,
 type View,
 type NervousSide,
 type NervousLayers,
 type NervousSelection
} from './anatomy';
import {overlayCard} from './trigeminal';

type PillType = 'all' | 'skeleton' | 'trigeminal' | 'organs';

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
 nervousSide:DEFAULT_NERVOUS_SIDE
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
 const visibleCount=atlas?.parts.filter(p=>state.isolate?state.selected.includes(p.id):state.visible.includes(p.system)||state.selected.includes(p.id)).length??0;
 
 const results=useMemo(()=>{
  if(!atlas)return[];
  const term=query.toLowerCase().trim();
  if(!term)return ['heart','brain','liver','stomach','spleen','pancreas','urinary bladder','trachea'].map(name=>atlas.concepts.find(c=>c.name.toLowerCase()===name)).filter((x):x is Concept=>!!x);
  return atlas.concepts.filter(c=>c.name.toLowerCase().includes(term)||c.id.toLowerCase().includes(term)).sort((a,b)=>a.name.length-b.name.length).slice(0,80);
 },[atlas,query]);

 const choose=(c:Concept)=>{
  setChosen(c);
  setState(s=>({...s,selected:c.elements,isolate:false,rotate:false,nervousSelection:null}));
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
  setState(s=>({...s,selected:[id],isolate:false,rotate:false,nervousSelection:null}));
  setDetails(true);
  setPanel(null);
 };

 const chooseNervousSelection=(sel:NervousSelection|null)=>{
  setState(s=>({...s,nervousSelection:sel,selected:[],isolate:false,rotate:false}));
  if(sel){
   setChosen(null);
   setDetails(true);
  }
 };

 const toggle=(id:SystemId)=>{
  setDetails(false);
  setState(s=>({...s,selected:[],isolate:false,visible:s.visible.includes(id)?s.visible.filter(x=>x!==id):[...s.visible,id]}));
 };

 const reset=()=>{
  setActivePill('all');
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
  setState(s=>({...s,nervousLayers:{...s.nervousLayers,...patch},nervousSelection:null}));
 };

 const setNervousSide=(side:NervousSide)=>{
  setState(s=>({...s,nervousSide:side,nervousSelection:null,reset:s.reset+1}));
 };

 const selectPill=(pill:PillType)=>{
  setActivePill(pill);
  setChosen(null);
  setDetails(false);
  if(pill==='all'){
   setState(s=>({...s,nervousOverlay:true,nervousSelection:null,nervousLayers:DEFAULT_NERVOUS_LAYERS,selected:[],isolate:false,visible:activeSystems.map(x=>x.id)}));
  } else if(pill==='skeleton'){
   setState(s=>({...s,nervousOverlay:false,nervousSelection:null,selected:[],isolate:false,visible:SKELETON_VISIBLE}));
  } else if(pill==='trigeminal'){
   setState(s=>({...s,nervousOverlay:true,nervousSelection:null,nervousLayers:DEFAULT_NERVOUS_LAYERS,nervousSide:s.nervousSide||DEFAULT_NERVOUS_SIDE,selected:[],isolate:false,visible:TRIGEMINAL_VISIBLE,view:'three-quarter',reset:s.reset+1}));
  } else if(pill==='organs'){
   setState(s=>({...s,nervousOverlay:false,nervousSelection:null,selected:[],isolate:false,visible:ORGANS_VISIBLE}));
  }
 };

 const nervousDetail = state.nervousOverlay && state.nervousSelection ? overlayCard(state.nervousSelection) : null;

 // Filter rows based on active pill
 const showSkeletonRows = activePill === 'all' || activePill === 'skeleton';
 const showTrigeminalRows = activePill === 'all' || activePill === 'trigeminal';
 const showOrganRows = activePill === 'all' || activePill === 'organs';

 // Skeleton group includes skeleton, muscles, connective tissue, body surface
 const skeletonSystems = activeSystems.filter(s=>SKELETON_SYSTEM_IDS.includes(s.id));
 // Organ group includes visceral organs, cardiac, vascular, nervous
 const organSystems = activeSystems.filter(s=>ORGAN_SYSTEM_IDS.includes(s.id));

 return <main className="studio">
  {atlas&&<AnatomyScene 
   atlas={atlas} 
   state={{...state,inspectorOpen:details&&(selectedParts.length>0||!!state.nervousSelection)}} 
   onSelect={choosePart} 
   onNervousSelect={chooseNervousSelection}
   onProgress={n=>{setProgress(n);if(n===100)setError('');}} 
   onError={setError}
  />}
  <div className="vignette"/>
  <header className="identity">
   <div className="eyebrow"><span className="status-dot"/> INTERACTIVE ANATOMY</div>
   <h1>Human Atlas<Badge variant="outline" className="edition">3D</Badge></h1>
   <div className="identity-meta">{atlas?atlas.parts.length.toLocaleString():'2,234'} modeled pieces <span>·</span> BodyParts3D</div>
  </header>
  <nav className="top-actions" aria-label="Explorer panels">
   <Button variant="ghost" className={panel==='search'?'active':''} onClick={()=>openPanel('search')} aria-label="Search anatomy">
    <Search size={18}/><span>Find a structure</span><kbd>/</kbd>
   </Button>
   <Button variant="ghost" className="icon-button" aria-label="About this atlas" onClick={()=>{setDetails(false);setPanel(null);setAbout(true);}}>
    <Info size={18}/>
   </Button>
  </nav>

  <section className={`layers-panel glass ${panel==='layers'?'mobile-open':''}`} aria-label="Anatomical layers">
   <div className="panel-heading">
    <span>Systems</span>
    <Button variant="ghost" className="mobile-only icon-button" onClick={()=>setPanel(null)} aria-label="Close systems"><X size={18}/></Button>
    <Badge variant="secondary" className="desktop-only small-number">{activeSystems.length}</Badge>
   </div>

   {/* Systems pills: All | Skeleton | Trigeminal | Organs */}
   <div className="layer-presets">
    <Button variant="ghost" aria-pressed={activePill==='all'} onClick={()=>selectPill('all')}>All</Button>
    <Button variant="ghost" aria-pressed={activePill==='skeleton'} onClick={()=>selectPill('skeleton')}>Skeleton</Button>
    <Button variant="ghost" aria-pressed={activePill==='trigeminal'} onClick={()=>selectPill('trigeminal')}>Trigeminal</Button>
    <Button variant="ghost" aria-pressed={activePill==='organs'} onClick={()=>selectPill('organs')}>Organs</Button>
   </div>

   {/* Laterality controls ONLY when Trigeminal pill is active */}
   {activePill==='trigeminal' && (
    <div className="side-presets layer-presets">
     <Button variant="ghost" aria-pressed={state.nervousSide==='left'} onClick={()=>setNervousSide('left')}>Left</Button>
     <Button variant="ghost" aria-pressed={state.nervousSide==='right'} onClick={()=>setNervousSide('right')}>Right</Button>
     <Button variant="ghost" aria-pressed={state.nervousSide==='both'} onClick={()=>setNervousSide('both')}>Both</Button>
    </div>
   )}

   <div className="layers-scroll">
    {/* Skeleton rows (Skeleton + Soft tissue / Muscles / Connective / Body surface) */}
    {showSkeletonRows && (
     <div className="stock-systems" aria-label="Skeleton & soft tissue systems">
      {activePill==='all' && <div className="system-column-label">Skeleton & Soft Tissue</div>}
      {skeletonSystems.map(s=>(
       <div className={`system-row ${state.visible.includes(s.id)?'enabled':''}`} key={s.id}>
        <Button variant="ghost" className="system-name" title={`Show only ${s.name.toLowerCase()}`} onClick={()=>setState(v=>({...v,visible:[s.id],isolate:false,selected:[]}))}>
         <span className="system-dot" style={{background:s.color}}/>{s.name}<span className="system-count">{counts[s.id]}</span>
        </Button>
        <Switch checked={state.visible.includes(s.id)} onCheckedChange={()=>toggle(s.id)} aria-label={`Show ${s.name.toLowerCase()}`} />
       </div>
      ))}
     </div>
    )}

    {/* Trigeminal rows */}
    {showTrigeminalRows && (
     <div className="overlay-layers" aria-label="Trigeminal overlay layers">
      {activePill==='all' && <div className="system-column-label">Trigeminal (CN V)</div>}
      
      {/* CN V */}
      <div className={`system-row ${state.nervousLayers.cnv?'enabled':''}`}>
       <Button variant="ghost" className="system-name" title="Show or hide the yellow trigeminal tree" onClick={()=>patchNervousLayers({cnv:!state.nervousLayers.cnv})}>
        <span className="system-dot" style={{background:'#e6c445'}}/>CN V<span className="layer-sub">yellow nerves</span>
       </Button>
       <Switch checked={state.nervousLayers.cnv} onCheckedChange={on=>patchNervousLayers({cnv:on})} aria-label="Show trigeminal nerve" />
      </div>

      {/* V1 */}
      <div className={`system-row ${state.nervousLayers.v1?'enabled':''}`}>
       <Button variant="ghost" className="system-name" title="Study ophthalmic V1 (forehead & eye)" onClick={()=>patchNervousLayers({v1:!state.nervousLayers.v1})}>
        <span className="system-dot" style={{background:'#2aa8b8'}}/>V1<span className="layer-sub">forehead & eye</span>
       </Button>
       <Switch checked={state.nervousLayers.v1} onCheckedChange={on=>patchNervousLayers({v1:on})} aria-label="Show ophthalmic V1" />
      </div>

      {/* V2 */}
      <div className={`system-row ${state.nervousLayers.v2?'enabled':''}`}>
       <Button variant="ghost" className="system-name" title="Study maxillary V2 (cheek & upper lip)" onClick={()=>patchNervousLayers({v2:!state.nervousLayers.v2})}>
        <span className="system-dot" style={{background:'#3daf6a'}}/>V2<span className="layer-sub">cheek & upper lip</span>
       </Button>
       <Switch checked={state.nervousLayers.v2} onCheckedChange={on=>patchNervousLayers({v2:on})} aria-label="Show maxillary V2" />
      </div>

      {/* V3 */}
      <div className={`system-row ${state.nervousLayers.v3Jaw||state.nervousLayers.v3Temple?'enabled':''}`}>
       <Button variant="ghost" className="system-name" title="Study mandibular V3" onClick={()=>patchNervousLayers({v3Jaw:!(state.nervousLayers.v3Jaw||state.nervousLayers.v3Temple),v3Temple:!(state.nervousLayers.v3Jaw||state.nervousLayers.v3Temple)})}>
        <span className="system-dot" style={{background:'#8a5bb8'}}/>V3<span className="layer-sub">two skin areas</span>
       </Button>
       <Switch checked={state.nervousLayers.v3Jaw||state.nervousLayers.v3Temple} onCheckedChange={on=>patchNervousLayers({v3Jaw:on,v3Temple:on})} aria-label="Show mandibular V3" />
      </div>

      {/* Indented Jaw & chin */}
      <div className={`system-row overlay-child ${state.nervousLayers.v3Jaw?'enabled':''}`}>
       <Button variant="ghost" className="system-name" title="Lower face: jaw, chin, lower lip" onClick={()=>patchNervousLayers({v3Jaw:!state.nervousLayers.v3Jaw})}>
        <span className="system-dot" style={{background:'#8a5bb8'}}/>Jaw & chin
       </Button>
       <Switch checked={state.nervousLayers.v3Jaw} onCheckedChange={on=>patchNervousLayers({v3Jaw:on})} aria-label="Show V3 jaw and chin" />
      </div>

      {/* Indented Temple & ear */}
      <div className={`system-row overlay-child ${state.nervousLayers.v3Temple?'enabled':''}`}>
       <Button variant="ghost" className="system-name" title="Side of head: temple & ear" onClick={()=>patchNervousLayers({v3Temple:!state.nervousLayers.v3Temple})}>
        <span className="system-dot" style={{background:'#9b6cc9'}}/>Temple & ear
       </Button>
       <Switch checked={state.nervousLayers.v3Temple} onCheckedChange={on=>patchNervousLayers({v3Temple:on})} aria-label="Show V3 temple and ear" />
      </div>
     </div>
    )}

    {/* Organ rows */}
    {showOrganRows && (
     <div className="stock-systems" aria-label="Organ systems">
      {activePill==='all' && <div className="system-column-label">Organs & viscera</div>}
      {organSystems.map(s=>(
       <div className={`system-row ${state.visible.includes(s.id)?'enabled':''}`} key={s.id}>
        <Button variant="ghost" className="system-name" title={`Show only ${s.name.toLowerCase()}`} onClick={()=>setState(v=>({...v,visible:[s.id],isolate:false,selected:[]}))}>
         <span className="system-dot" style={{background:s.color}}/>{s.name}<span className="system-count">{counts[s.id]}</span>
        </Button>
        <Switch checked={state.visible.includes(s.id)} onCheckedChange={()=>toggle(s.id)} aria-label={`Show ${s.name.toLowerCase()}`} />
       </div>
      ))}
     </div>
    )}
   </div>

   <div className="panel-foot">
    <span>{visibleCount.toLocaleString()} pieces visible</span>
    <Button variant="ghost" onClick={()=>setState(s=>({...s,visible:[],selected:[],isolate:false,nervousOverlay:false}))}>Hide all</Button>
   </div>
  </section>

  {panel==='search'&&<section className="search-panel glass" aria-label="Find anatomy">
   <div className="panel-heading"><span>Find a structure</span><Button variant="ghost" className="icon-button" onClick={()=>setPanel(null)} aria-label="Close search"><X size={18}/></Button></div>
   <Combobox<Concept> items={results} value={null} onValueChange={value=>{if(value)choose(value);}} inputValue={query} onInputValueChange={setQuery} itemToStringLabel={c=>c.name} filter={null} open onOpenChange={open=>{if(!open)setPanel(null);}}><ComboboxInput autoFocus placeholder="Heart, femur, cranial nerve…" aria-label="Search named anatomical structures" showTrigger={false}/><ComboboxContent className="anatomy-search-results"><ComboboxEmpty>No structures match your search.</ComboboxEmpty><ComboboxList>{(c:Concept)=><ComboboxItem key={c.id} value={c}><span className="search-result-name">{c.name}</span><span className="small-number">{c.elements.length} {c.elements.length===1?'piece':'pieces'}</span></ComboboxItem>}</ComboboxList></ComboboxContent></Combobox>
   <p className="search-note">{query?'Showing up to 80 matches. Refine your search to find smaller structures.':'Start with a major organ, or search every named structure.'}</p>
  </section>}

  <nav className="view-controls glass" aria-label="Camera controls">
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
  </nav>

  <div className="scene-caption">
   <span className="caption-line"/>
   <span>{state.nervousOverlay&&activePill==='trigeminal'?'TRIGEMINAL NERVE (CN V) · TEACHING OVERLAY':state.isolate?(chosen?.name??'SELECTED STRUCTURE'):state.explode>.95?'ANATOMICAL INVENTORY':state.explode>.05?'SEPARATED STRUCTURES':'ADULT HUMAN · MALE'}</span>
   <span className="caption-line"/>
  </div>

  <div className="bottom-dock glass">
   <Button variant="ghost" className="mobile-only dock-layers" onClick={()=>openPanel('layers')} aria-label="Open system layers">
    <Layers3 size={20}/><span>Systems</span>
   </Button>
   <div className="explode-control">
    <div className="explode-label"><label id="explode-label">Explode anatomy</label><output>{Math.round(state.explode*100)}<span>%</span></output></div>
    <Slider aria-labelledby="explode-label" min={0} max={100} step={1} value={[state.explode*100]} onValueChange={v=>setState(s=>({...s,explode:(Array.isArray(v)?v[0]:v)/100,view:(Array.isArray(v)?v[0]:v)>80?'front':s.view,rotate:false}))}/>
    <div className="slider-endpoints"><span>Assembled</span><span>Every piece</span></div>
   </div>
   <Button variant="ghost" className="dock-reset" onClick={reset} aria-label="Assemble and reset"><RotateCcw size={18}/><span>Reset</span></Button>
  </div>

  <footer className="studio-footer">
   <span>{state.explode>.8?'Drag to pan':'Drag to orbit'} <b>·</b> Pinch to zoom <b>·</b> Tap to inspect</span>
   <Button variant="ghost" onClick={()=>{setDetails(false);setPanel(null);setAbout(true);}}>Source & credits <ArrowUpRight size={12}/></Button>
  </footer>

  {progress<100&&!error&&<div className="loading glass" role="status"><Activity size={18}/><div><strong>Preparing the anatomy</strong><span>{progress}% · Loading {atlas?.parts.length.toLocaleString()??'2,234'} pieces</span><div className="loading-track"><i style={{width:`${progress}%`}}/></div></div></div>}
  {error&&<div className="loading glass error" role="alert"><p>{error}</p><Button variant="ghost" onClick={()=>location.reload()}>Reload viewer</Button></div>}

  {/* Detail Inspector Sheet for Mesh or Trigeminal Element */}
  <Sheet open={details&&(selectedParts.length>0||!!nervousDetail)} modal={false} disablePointerDismissal onOpenChange={setDetails}>
   <SheetContent initialFocus={detailTitle} className={`detail-sheet glass ${state.isolate?'is-isolated':''}`} showCloseButton={true}>
    {nervousDetail ? (
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
