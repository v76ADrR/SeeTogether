# Removals Log

Records intentional nukes: what was removed, why, and the exact code that was deleted.
Each entry is a dated, named block. Add new entries at the top.

---

## 2026-09-19 — Header identity copy (`app/page.tsx`)

**What:** Replaced the eyebrow label and h1 in the `<header className="identity">` block, and removed the `identity-meta` line entirely.

**Why:** Rebranding the header to reflect clinical context. "INTERACTIVE ANATOMY" → "History of patient"; "Human Atlas" → "Radiology reports"; the 3D badge was dropped along with the modeled-pieces / BodyParts3D attribution line below the title.

**Replaced: eyebrow text**

```tsx
// Before
<div className="eyebrow"><span className="status-dot"/> INTERACTIVE ANATOMY</div>

// After
<div className="eyebrow"><span className="status-dot"/> History of patient</div>
```

**Replaced: h1 (badge removed)**

```tsx
// Before
<h1>Human Atlas<Badge variant="outline" className="edition">3D</Badge></h1>

// After
<h1>Radiology reports</h1>
```

**Removed: identity-meta line**

```tsx
<div className="identity-meta">{atlas?atlas.parts.length.toLocaleString():'2,234'} modeled pieces <span>·</span> BodyParts3D</div>
```

---


## 2026-09-19 — About sheet body (`app/page.tsx`)

**What:** Removed the entire body of the About sheet (opened via the Info `ⓘ` button in the top bar).

**Why:** Cleared out boilerplate/placeholder content — scope/score paragraph, dataset credit block, three external links (Dataset license, Original geometry & metadata, Read the source publication). The Sheet shell and its built-in close button are preserved. Screen-reader-only `SheetTitle`/`SheetDescription` were added for a11y compliance.

**Removed code:**

```tsx
<div className="eyebrow">SOURCE &amp; SCOPE</div>
<SheetTitle className="structure-title">A body, revealed.</SheetTitle>
<SheetDescription>Explore the adult male reference anatomy from BodyParts3D.</SheetDescription>
<div className="about-copy">
 <p><strong>Male · BodyParts3D</strong><br/>2,234 individual meshes and 3,432 named concepts from an adult male reference anatomy.</p>
 <p>This reference does not contain every human structure or variation. Named concepts can contain multiple pieces; each source mesh is rendered once.</p>
 <p>Colors and system groupings are designed for exploration. The geometry is simplified for the web, and short explanations provide general educational context. This is an educational reference, not a diagnostic or surgical tool.</p>
 <h3>Source</h3>
 <p>BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.</p>
 <a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html" target="_blank" rel="noreferrer">Dataset license <ArrowUpRight size={14}/></a>
 <a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html" target="_blank" rel="noreferrer">Original geometry &amp; metadata <ArrowUpRight size={14}/></a>
 <a href="https://academic.oup.com/nar/article/37/suppl_1/D782/1000752" target="_blank" rel="noreferrer">Read the source publication <ArrowUpRight size={14}/></a>
</div>
```

---

## 2026-09-19 — Find a structure control (`app/page.tsx`)

**What:** Removed the "Find a structure" search button from the top-bar `top-actions` nav, its associated `/` keyboard shortcut, the `search-panel` section it toggled, and all dead wiring that became unused as a result.

**Why:** The feature — a floating search panel with a Combobox over anatomical concepts — was requested to be nuked. The Info `ⓘ` / About button in the same nav row is kept. Tap-to-inspect and the agent-tools `choose()` / `inspect_anatomical_structure` path are unaffected.

**Removed: Find button in `top-actions` nav**

```tsx
<Button variant="ghost" className={panel==='search'?'active':''} onClick={()=>openPanel('search')} aria-label="Search anatomy">
 <Search size={18}/><span>Find a structure</span><kbd>/</kbd>
</Button>
```

**Removed: `/` keyboard shortcut `useEffect`**

```ts
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
```

**Removed: `results` useMemo (fed only the search Combobox)**

```ts
const results=useMemo(()=>{
 if(!atlas)return[];
 const term=query.toLowerCase().trim();
 if(!term)return ['heart','brain','liver','stomach','spleen','pancreas','urinary bladder','trachea']
   .map(name=>atlas.concepts.find(c=>c.name.toLowerCase()===name))
   .filter((x):x is Concept=>!!x);
 return atlas.concepts
   .filter(c=>c.name.toLowerCase().includes(term)||c.id.toLowerCase().includes(term))
   .sort((a,b)=>a.name.length-b.name.length)
   .slice(0,80);
},[atlas,query]);
```

**Removed: search panel JSX section**

```tsx
{panel==='search'&&<section className="search-panel glass" aria-label="Find anatomy">
 <div className="panel-heading">
  <span>Find a structure</span>
  <Button variant="ghost" className="icon-button" onClick={()=>setPanel(null)} aria-label="Close search"><X size={18}/></Button>
 </div>
 <Combobox<Concept> items={results} value={null} onValueChange={value=>{if(value)choose(value);}}
   inputValue={query} onInputValueChange={setQuery} itemToStringLabel={c=>c.name}
   filter={null} open onOpenChange={open=>{if(!open)setPanel(null);}}>
  <ComboboxInput autoFocus placeholder="Heart, femur, cranial nerve…" aria-label="Search named anatomical structures" showTrigger={false}/>
  <ComboboxContent className="anatomy-search-results">
   <ComboboxEmpty>No structures match your search.</ComboboxEmpty>
   <ComboboxList>{(c:Concept)=>
    <ComboboxItem key={c.id} value={c}>
     <span className="search-result-name">{c.name}</span>
     <span className="small-number">{c.elements.length} {c.elements.length===1?'piece':'pieces'}</span>
    </ComboboxItem>}
   </ComboboxList>
  </ComboboxContent>
 </Combobox>
 <p className="search-note">{query?'Showing up to 80 matches. Refine your search to find smaller structures.':'Start with a major organ, or search every named structure.'}</p>
</section>}
```

**Removed: dead imports and state**

```ts
// lucide-react — Search icon no longer used:
Search

// combobox import line removed entirely:
import {Combobox,ComboboxInput,ComboboxContent,ComboboxList,ComboboxItem,ComboboxEmpty} from '@/components/ui/combobox';

// state — query/setQuery only fed search panel:
const [query,setQuery]=useState('');
```

**Type narrowings applied (not removed, just tightened):**

- `panel` state: `'layers'|'search'|null` → `'layers'|null`
- `openPanel` parameter: `'layers'|'search'` → `'layers'`
