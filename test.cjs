const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(__dirname+'/app.js','utf8');
const pick=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
async function run(){const logic=await import('./trunk-logic.mjs');const context={...logic,nodes:[{id:'n1',x:10,y:20}],routes:[]};
vm.createContext(context);
vm.runInContext(`const data=()=>({nodes,routes}); const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y); ${pick('function resolve(a)','const distance=')} ${pick('function orderMarks(', 'function drawOrder(')}; this.geometry=geometry;this.orderMarks=orderMarks;`,context);
let g=context.geometry([{node:'n1'},{x:90,y:70}]);
assert.deepStrictEqual(JSON.parse(JSON.stringify(g)),[{x:10,y:20},{x:90,y:20},{x:90,y:70}]);
context.nodes[0].x=15;g=context.geometry([{node:'n1'},{x:90,y:70,flip:true}]);
assert.deepStrictEqual(JSON.parse(JSON.stringify(g)),[{x:15,y:20},{x:15,y:70},{x:90,y:70}]);
const marks=context.orderMarks([{x:0,y:0},{x:100,y:0},{x:0,y:0}],{label:'TR-7',fontSize:9});
assert.strictEqual(marks.length,2);assert.strictEqual(marks[0].text,'TR-7 / 01');assert.strictEqual(marks[1].text,'TR-7 / 02');
assert(marks[0].badge.y>0&&marks[1].badge.y<0,'Return leg uses opposite side');
assert(marks[0].tip.x>marks[0].left.x&&marks[1].tip.x<marks[1].left.x,'Arrows point in travel direction');
assert(marks[0].badge.x<marks[1].badge.x,'Return badge is separated along retraced path');
console.log('PASS: orthogonal elbows, alternate elbows, attached nodes, ordered return legs, separated badges and directional arrows');

const finishLoop=logic.loopConnection({x:10,y:20},{x:80,y:55,node:'device'});
assert.strictEqual(finishLoop.length,2);
assert.strictEqual(finishLoop.at(-1).node,'device');
assert.deepStrictEqual(finishLoop.map(p=>[p.x,p.y]),[[80,20],[80,55]]);
assert.strictEqual(logic.loopConnection({x:10,y:20},{x:10,y:55,node:'eol'}).at(-1).node,'eol');
assert.deepStrictEqual(logic.loopConnection({x:10,y:20},{x:80,y:55,node:'device'},true).map(p=>[p.x,p.y]),[[10,55],[80,55]]);
console.log('PASS: loop device click completes aligned, off-axis, alternate-axis and EOL terminal connections');

// Tap-to-turn stores the terminal elbow explicitly. A 1 pt jog must not
// collapse a requested 16 pt loop gap below the 2 pt cable stroke.
const overlapTrunk={id:'overlap-main',kind:'central',anchors:[{x:500,y:225.5098314023642},{x:270,y:225.5098314023642}]};
const overlapLoop={id:'overlap-loop',kind:'loop',trunk:'overlap-main',width:2,anchors:[{x:356.4066531375346,y:225.5098314023642},{x:356.4066531375346,y:303.441421468525},{x:357.42252788060375,y:303.441421468525}]};
const unchangedOverlap=JSON.stringify(overlapLoop);
const overlapDrawing=logic.drawingFor(overlapLoop,[overlapTrunk,overlapLoop],a=>a,16,1);
assert.strictEqual(overlapDrawing.effectiveGap,16,'Tiny explicit endpoint elbow does not squeeze paired cable lanes');
assert.strictEqual(JSON.stringify(overlapLoop),unchangedOverlap,'Cleanup preserves saved waypoints');
const longLegs=overlapDrawing.points.slice(1).map((b,i)=>({a:overlapDrawing.points[i],b})).filter(s=>Math.abs(s.a.y-s.b.y)>50);
assert.strictEqual(longLegs.length,2);
assert(Math.abs(longLegs[0].a.x-longLegs[1].a.x)>=16-1e-6,'Both long cable legs remain visibly separate');
console.log('PASS: reported tiny terminal jog keeps full loop spacing with explicit tap-to-turn corners');

const cornerParent={id:'corner-regression',kind:'central',anchors:[{x:345,y:999},{x:345,y:667.929},{x:371.378,y:667.929},{x:371.378,y:840}]};
const cornerLoop={id:'corner-device',kind:'loop',trunk:cornerParent.id,anchors:[{x:371.378,y:674.948},{x:418.511,y:674.948},{x:418.511,y:669.011}]};
const cornerFixed=logic.drawingFor(cornerLoop,[cornerParent,cornerLoop],a=>a,9,1);
assert.strictEqual(cornerFixed.effectiveGap,9,'Near-corner takeoff keeps requested spacing');
const terminalLanes=cornerFixed.points.slice(1).map((b,i)=>({a:cornerFixed.points[i],b})).filter(s=>s.a.y===s.b.y&&Math.abs(s.a.x-s.b.x)>20);
assert(terminalLanes.length>=2);
assert(Math.abs(terminalLanes[0].a.y-terminalLanes.at(-1).a.y)>=9-1e-6,'Corner lanes stay separated');
console.log('PASS: point 205 near-corner takeoff uses separate tangent ports and full spacing');

// A doubled-back trunk can be closer to the device on a different leg.
// Cleanup must project onto the selected takeoff leg, not that other run.
const backParent={id:'back-parent',kind:'central',anchors:[{x:585,y:829},{x:508,y:829},{x:508,y:999},{x:345,y:999},{x:345,y:668}]};
const backLoop={id:'back-loop',kind:'loop',trunk:backParent.id,anchors:[{x:443.3971173483728,y:999},{x:443.3971173483728,y:914.713080314793},{x:444.4980287889498,y:914.713080314793}]};
const backDrawing=logic.drawingFor(backLoop,[backParent,backLoop],a=>a,9,1);
assert.strictEqual(backDrawing.effectiveGap,9,'Other nearby trunk leg cannot collapse chosen takeoff gap');
const longVerticals=backDrawing.points.slice(1).map((b,i)=>({a:backDrawing.points[i],b})).filter(s=>s.a.x===s.b.x&&Math.abs(s.a.y-s.b.y)>60);
assert.strictEqual(longVerticals.length,2);assert(Math.abs(longVerticals[0].a.x-longVerticals[1].a.x)>=9-1e-6);
console.log('PASS: point 209 doubled-back trunk cleans endpoint against its own takeoff leg');

const endpointContext={model:{settings:{showNames:false}},data:()=>({nodes:[]}),trunkEndName:logic.trunkEndName};vm.createContext(endpointContext);vm.runInContext(pick('function endpointName(', 'function eolOnTrunk(')+';this.endpointName=endpointName',endpointContext);
assert.strictEqual(endpointContext.endpointName({boxName:'JACE-2'}),'JACE-2','Names off retains the edited box identifier');
assert.strictEqual(endpointContext.endpointName({anchors:[],endName:'West END'},true),'West END','Names off retains edited end identifier');
assert.strictEqual(endpointContext.endpointName({}),'BOX');
assert(source.includes('text(endpointName(r,false,markings.nodes),'),'PDF export shares on-screen box naming');
assert(source.includes('text(endpointName(r,true,markings.nodes),'),'PDF export shares on-screen end naming');
console.log('PASS: custom box/end names remain visible with Names off and use same names in PDF');

const renameRows={nodes:[{id:'point',x:10,y:10,label:'PT-1'},{id:'eol',kind:'eol',x:90,y:90,label:'EOL'}],routes:[{id:'box',kind:'central',anchors:[{x:30,y:30},{node:'eol',x:90,y:90}],boxName:'BOX',endNameAuto:true}]};
const controls={};const control=id=>controls[id]??(controls[id]={value:'',textContent:'',open:false,focus(){},select(){},showModal(){this.open=true},close(){this.open=false},addEventListener(){}});
const snapshots=[];const rc={data:()=>renameRows,$:control,scale:1,distance:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),resolve:a=>a,checkpoint:()=>snapshots.push(JSON.stringify(renameRows)),changed:()=>{},status:()=>{},trunkEndName:logic.trunkEndName,selected:null};vm.createContext(rc);vm.runInContext(pick('let renameTarget=null',"svg.addEventListener('pointerup',"),rc);
assert(rc.renameAt({x:10,y:10}));control('renameValue').value='VAV-101';control('renameForm').onsubmit({preventDefault(){}});assert.strictEqual(renameRows.nodes[0].label,'VAV-101');assert.strictEqual(JSON.parse(snapshots[0]).nodes[0].label,'PT-1','Rename checkpoint supports undo');
assert(rc.renameAt({x:30,y:30}));control('renameValue').value='JACE-1';control('renameForm').onsubmit({preventDefault(){}});assert.strictEqual(renameRows.routes[0].boxName,'JACE-1');
assert(rc.renameAt({x:90,y:90}));control('renameValue').value='EOL-West';control('renameForm').onsubmit({preventDefault(){}});assert.strictEqual(logic.trunkEndName(renameRows.routes[0],renameRows.nodes),'EOL-West');
assert(rc.renameAt({x:30,y:30}));control('renameValue').value='Cancelled';control('cancelRename').onclick();assert.strictEqual(renameRows.routes[0].boxName,'JACE-1');assert(!rc.renameAt({x:200,y:200}));
console.log('PASS: direct point/box/EOL rename, cancellation, undo checkpoint and linked EOL name');

const visibilityContext={model:{settings:{showNames:false}}};vm.createContext(visibilityContext);vm.runInContext(pick('function pointNameVisible(', 'function eolOnTrunk(')+';this.visible=pointNameVisible',visibilityContext);
assert.strictEqual(visibilityContext.visible({}),false);assert.strictEqual(visibilityContext.visible({showName:true}),true);assert.strictEqual(visibilityContext.visible({showName:false}),false);visibilityContext.model.settings.showNames=true;assert.strictEqual(visibilityContext.visible({}),true);assert.strictEqual(visibilityContext.visible({showName:false}),false);
assert(source.includes('if(pointNameVisible(n)&&!eolOnTrunk(n,markings))'),'Export respects individual name overrides');
console.log('PASS: individual point names override global visibility in drawing and PDF export');

const labelNode={id:'label-test',x:200,y:300,labelDx:10,labelDy:-4};let moveHandler;const labelContext={svg:{addEventListener:(name,fn)=>{if(name==='pointermove')moveHandler=fn}},pos:e=>e,data:()=>({nodes:[labelNode]}),drag:{kind:'node-label',id:labelNode.id,start:{x:40,y:50},original:{...labelNode}},draw:()=>{}};vm.createContext(labelContext);vm.runInContext(pick("svg.addEventListener('pointermove',",'let renameTarget=null'),labelContext);moveHandler({x:100,y:100});assert.deepStrictEqual([labelNode.x,labelNode.y],[200,300],'Dragging label leaves point position and attached cable unchanged');assert.deepStrictEqual([labelNode.labelDx,labelNode.labelDy],[70,46]);vm.runInContext(pick('function pointLabelAnchor(', 'function pointLabel(')+';this.anchor=pointLabelAnchor',labelContext);assert.deepStrictEqual(JSON.parse(JSON.stringify(labelContext.anchor(labelNode))),{x:270,y:346});assert(source.includes('text(n.label,pointLabelAnchor(n),n.fontSize)'),'PDF uses saved label offset');
console.log('PASS: dragging only moves point label, preserves marker coordinates, and shares position with PDF');

const angledStep=logic.draftStep({x:0,y:0},{x:80,y:35},false,true);assert.strictEqual(angledStep.free,true);assert.deepStrictEqual(logic.orthogonal([{x:0,y:0},angledStep]),[{x:0,y:0},{x:80,y:35}]);assert.strictEqual(logic.loopConnection({x:0,y:0},{x:80,y:35,node:'end'},false,true).length,1);
const angleMain={id:'angle',kind:'central',anchors:[{x:0,y:0},{x:150,y:75,free:true}]};const angleLoop={id:'al',kind:'loop',trunk:'angle',anchors:[{x:75,y:37.5},{x:120,y:140,free:true}]};const angleDrawing=logic.drawingFor(angleLoop,[angleMain,angleLoop],a=>a,9,1);assert(angleDrawing.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));const lanes=angleDrawing.points.slice(1).map((b,i)=>({a:angleDrawing.points[i],b})).filter(s=>Math.hypot(s.b.x-s.a.x,s.b.y-s.a.y)>80);assert.strictEqual(lanes.length,2);assert(lanes.every(s=>s.a.x!==s.b.x&&s.a.y!==s.b.y),'Angled loop legs are retained without elbows');const angleBefore=JSON.stringify(logic.orthogonal(angleMain.anchors));logic.reverseCentral(angleMain,[angleMain]);assert.deepStrictEqual(logic.orthogonal(angleMain.anchors),JSON.parse(angleBefore).reverse());
console.log('PASS: free-angle drafting, diagonal trunk/paired loop geometry, and reversal preserve angles');

const labelTrunk={id:'trunk-label-test',anchors:[{x:20,y:30},{x:100,y:100}],boxLabelDx:5,boxLabelDy:-2};const fixedCable=JSON.stringify(labelTrunk.anchors);let trunkMove;const tc={svg:{addEventListener:(name,fn)=>{if(name==='pointermove')trunkMove=fn}},pos:e=>e,data:()=>({routes:[labelTrunk]}),drag:{kind:'trunk-label',id:labelTrunk.id,end:false,start:{x:10,y:10},original:{...labelTrunk}},draw:()=>{}};vm.createContext(tc);vm.runInContext(pick("svg.addEventListener('pointermove',",'let renameTarget=null'),tc);trunkMove({x:40,y:25});assert.strictEqual(JSON.stringify(labelTrunk.anchors),fixedCable,'Box label drag keeps box and cable anchors fixed');assert.deepStrictEqual([labelTrunk.boxLabelDx,labelTrunk.boxLabelDy],[35,13]);vm.runInContext(pick('function trunkLabelAnchor(', 'function trunkLabel(')+';this.anchor=trunkLabelAnchor',tc);assert.deepStrictEqual(JSON.parse(JSON.stringify(tc.anchor(labelTrunk,{x:20,y:30}))),{x:55,y:66});assert(source.includes('text(endpointName(r,false,markings.nodes),trunkLabelAnchor(r,ps[0]),r.fontSize)'),'PDF uses box-label drag offsets');
console.log('PASS: box label drag leaves cable fixed and shares saved offsets with PDF export');

// Page 29: a nearly vertical free-angle trunk with a 0.393 pt endpoint jog.
const page29Trunk={id:'page29-main',kind:'central',anchors:[{x:933.0661746345593,y:164.7410787154202},{x:933.613013593626,y:211.63368791470558,free:true}]};
const page29Loop={id:'page29-loop',kind:'loop',trunk:page29Trunk.id,anchors:[{x:933.1954549432946,y:175.8268717316006},{x:1000.0435792831874,y:175.8268717316006},{x:1000.0435792831874,y:175.43386961721137}]};
const page29Before=JSON.stringify(page29Loop),page29Drawing=logic.drawingFor(page29Loop,[page29Trunk,page29Loop],a=>a,9,1);
assert.strictEqual(page29Drawing.effectiveGap,9,'Slightly angled trunk keeps full spacing despite tiny endpoint jog');assert.strictEqual(JSON.stringify(page29Loop),page29Before,'Page 29 saved anchors stay intact');
const page29Legs=page29Drawing.points.slice(1).map((b,i)=>({a:page29Drawing.points[i],b})).filter(s=>Math.hypot(s.a.x-s.b.x,s.a.y-s.b.y)>50);assert.strictEqual(page29Legs.length,2);const len=Math.hypot(page29Legs[0].b.x-page29Legs[0].a.x,page29Legs[0].b.y-page29Legs[0].a.y);assert(Math.abs((page29Legs[0].b.x-page29Legs[0].a.x)*(page29Legs[1].a.y-page29Legs[0].a.y)-(page29Legs[0].b.y-page29Legs[0].a.y)*(page29Legs[1].a.x-page29Legs[0].a.x))/len>8.99,'Long angled loop lanes remain 9pt apart');
console.log('PASS: actual page 29 slightly angled takeoff retains both separated loop legs');

const throughNodes=[{id:'through-a',x:80,y:35,kind:'point'},{id:'through-b',x:140,y:90,kind:'point'},{id:'through-end',x:180,y:160,kind:'eol'}];let throughFinished=0;const through={data:()=>({nodes:throughNodes}),draft:[{x:0,y:0}],tool:'central',pendingEndpoint:null,pointer:null,model:{settings:{rightAngles:true}},window:{flipElbow:false},resolve:a=>a.node?throughNodes.find(n=>n.id===a.node):a,snap:p=>p,distance:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),loopConnection:logic.loopConnection,draftStep:logic.draftStep,draw:()=>{},status:()=>{},finishRoute:()=>throughFinished++};vm.createContext(through);let throughBody=pick('const clickedNode=',"svg.addEventListener('pointermove',");throughBody=throughBody.slice(0,throughBody.lastIndexOf('});'));vm.runInContext('this.tapPoint=function(e,p){'+throughBody+'}',through);
const tapThrough=id=>through.tapPoint({target:{dataset:{kind:'node',id}}},throughNodes.find(n=>n.id===id));tapThrough('through-a');assert.strictEqual(through.draft.at(-1).node,'through-a');assert.strictEqual(throughFinished,0,'Regular point keeps central trunk open');tapThrough('through-b');assert.strictEqual(through.draft.at(-1).node,'through-b');assert.strictEqual(throughFinished,0);assert.strictEqual(through.pendingEndpoint,null);tapThrough('through-end');assert.strictEqual(throughFinished,1,'EOL still finishes central trunk');const beforeMove=logic.orthogonal(through.draft,through.resolve);throughNodes[0].x+=10;const afterMove=logic.orthogonal(through.draft,through.resolve);assert(afterMove.some(p=>p.x===90&&p.y===35),'Trunk retains live attachment through intermediate point');assert.notDeepStrictEqual(beforeMove,afterMove);
console.log('PASS: central trunk attaches through successive regular points and finishes only at EOL');

through.tool='floor';through.draft=[{x:80,y:35,node:'through-a'}];throughFinished=0;tapThrough('through-b');assert.strictEqual(throughFinished,1,'Dotted point-to-point link finishes on second point');assert.strictEqual(through.draft.at(-1).node,'through-b');assert.strictEqual(through.draft.at(-1).free,true,'Dotted floor link goes directly between points');
const dotted={id:'dotted',kind:'floor-link',width:2,anchors:[{x:10,y:20,node:'a'},{x:100,y:80,node:'b',free:true}]};assert.deepStrictEqual(logic.routeStroke(dotted,{loopStyle:'solid'}),{dash:[0,5],cap:1});const dottedReopened=JSON.parse(JSON.stringify(dotted));assert.strictEqual(logic.drawingFor(dottedReopened,[dottedReopened],a=>a).points.length,2);assert(source.includes('P.setLineCap(routeStroke(r,model.settings).cap),P.setDashPattern(routeStroke(r,model.settings).dash,0)'),'PDF uses same dotted pattern and round caps as preview');
console.log('PASS: dotted floor links connect two points, retain direct geometry after reopen, and export true dots');

for(const [toolName,kind]of [['route','route'],['central','central'],['loop','loop'],['floor','floor-link']]){const finishRows={nodes:[],routes:[]};const fc={tool:toolName,pendingEndpoint:null,draft:[{x:10,y:20,trunk:toolName==='loop'?'parent':undefined},{x:100,y:80,free:true}],data:()=>finishRows,model:{settings:{lineWidth:2,fontSize:9,trunkPrefix:'TR-',defaultBoxName:'BOX',defaultEndName:'END'},nextTrunk:1},uid:()=>toolName,checkpoint:()=>{},changed:()=>{},status:()=>{},structuredClone,pointer:null,activeTrunk:''};vm.createContext(fc);vm.runInContext(pick('function finishRoute(){','function remove(){')+';finishRoute()',fc);assert.strictEqual(finishRows.routes.length,1,toolName+' finishes without a node endpoint');assert.strictEqual(finishRows.routes[0].kind,kind);assert.strictEqual(fc.draft.length,0)}
let enterHandler,enterFinished=0,prevented=false;const kc={window:{addEventListener:(type,fn)=>{if(type==='keydown')enterHandler=fn}},$:()=>({open:false}),tool:'floor',finishRoute:()=>enterFinished++};vm.createContext(kc);vm.runInContext(pick("window.addEventListener('keydown',","window.addEventListener('keyup',"),kc);enterHandler({key:'Enter',target:{tagName:'BUTTON'},preventDefault:()=>prevented=true});assert.strictEqual(enterFinished,1);assert(prevented,'Enter cannot reactivate focused toolbar button');
console.log('PASS: Enter finishes all four line types at loose endpoints and prevents toolbar reactivation');

const groupLogic=await import('./page-groups.mjs');const manualGroups=[{id:'user-building',name:'Dryer Hall',pages:[6,7,8,9],collapsed:false},{id:'user-building-2',name:'Vada Sheid',pages:[28,29,30],collapsed:true}];assert.deepStrictEqual(groupLogic.validatePageGroups(JSON.parse(JSON.stringify(manualGroups)),30),manualGroups);assert.deepStrictEqual(groupLogic.parsePageList('6-9, 12, 6',30),[6,7,8,9,12]);assert.strictEqual(groupLogic.pageRanges([9,6,8,7,12]),'6-9, 12');assert.throws(()=>groupLogic.parsePageList('29-31',30));assert.throws(()=>groupLogic.parsePageList('9-6',30));assert.throws(()=>groupLogic.validatePageGroups([{name:'A',pages:[1,2]},{name:'B',pages:[2]}],30),/more than one/);assert(source.includes('if(!model.pageGroups)model.pageGroups=[];'),'No automatic grouping');assert.deepStrictEqual(groupLogic.validatePageGroups([],30),[]);
console.log('PASS: manual building groups only, valid ranges, duplicate rejection and project roundtrip');

const trunk={id:'main',kind:'central',anchors:[{x:0,y:0},{x:100,y:0},{x:100,y:100}]};
const path=logic.orthogonal(trunk.anchors);
const near=logic.nearestOnPath({x:30,y:4},path),far=logic.nearestOnPath({x:96,y:80},path);
assert.strictEqual(near.station,30);assert.strictEqual(far.station,180);
const loops=[{id:'near',kind:'loop',trunk:'main',anchors:[{...near,trunk:'main'}]},{id:'far',kind:'loop',trunk:'main',anchors:[{...far,trunk:'main'}]}];
assert.deepStrictEqual(logic.orderedLoops(loops,trunk,path).map(r=>r.id),['far','near'],'Install from END toward BOX, regardless of creation order');
assert.deepStrictEqual(logic.attachmentPoint({leg:far.leg,t:far.t,trunk:'main'},[{x:0,y:0},{x:200,y:0},{x:200,y:100}]),{x:200,y:80},'Attachment follows edited trunk');
const moved={leg:1,t:.95};loops[0].anchors[0]=moved;
assert.deepStrictEqual(logic.orderedLoops(loops,trunk,path).map(r=>r.id),['near','far'],'Moving a takeoff updates loop order');
for(const ps of [[{x:10,y:10},{x:100,y:10},{x:100,y:80}],[{x:0,y:0},{x:100,y:0},{x:0,y:0}]]){const out=logic.loopPath(ps);assert.deepStrictEqual(out[0],out.at(-1),'Loop returns to trunk');for(let i=1;i<out.length;i++)assert(out[i].x===out[i-1].x||out[i].y===out[i-1].y,'All out-and-back legs stay orthogonal')}
context.routes.push(trunk);const attached=context.geometry([{trunk:'main',leg:1,t:.8,x:0,y:0},{node:'n1'}]);assert.deepStrictEqual(JSON.parse(JSON.stringify(attached[0])),{x:100,y:80});
const normalized=logic.attachmentPoint({along:.5},[{x:0,y:0},{x:10,y:0},{x:10,y:190}]);assert.deepStrictEqual(normalized,{x:10,y:90},'Attachment survives an added elbow');
const reversing={id:'rev',anchors:[{x:0,y:0},{x:100,y:100}]};const reversingLoop={kind:'loop',trunk:'rev',anchors:[{along:.25}]};const before=logic.orthogonal(reversing.anchors);const takeoff=logic.attachmentPoint(reversingLoop.anchors[0],before);logic.reverseCentral(reversing,[reversingLoop]);assert.deepStrictEqual(logic.orthogonal(reversing.anchors),before.slice().reverse());assert.deepStrictEqual(logic.attachmentPoint(reversingLoop.anchors[0],logic.orthogonal(reversing.anchors)),takeoff,'Reversing pull keeps loop position');
const mainPoints=[{x:0,y:0},{x:0,y:100}],excursion=logic.loopLayout([{x:0,y:50},{x:40,y:50}],mainPoints,12);
assert.deepStrictEqual(excursion.interval,[44,56]);assert.deepStrictEqual(excursion.points[0],{x:0,y:44});assert(logic.distance(excursion.points.at(-1),{x:0,y:56})<1e-8);
for(let i=1;i<excursion.points.length;i++)assert(excursion.points[i].x===excursion.points[i-1].x||excursion.points[i].y===excursion.points[i-1].y);
const pieces=logic.splitTrunk(mainPoints,[excursion.interval]);assert.strictEqual(pieces.length,2);assert(!logic.onVisiblePath({x:0,y:50},pieces),'No trunk bridge inside loop opening');assert(logic.onVisiblePath({x:0,y:20},pieces));
assert.strictEqual(logic.splitTrunk(mainPoints,[[40,55],[50,65]]).length,2,'Overlapping gaps merge');
const curvedMain=[{x:0,y:0},{x:100,y:0},{x:100,y:100}];const corner=logic.loopLayout([{x:100,y:0},{x:120,y:0},{x:120,y:40}],curvedMain,12);assert.deepStrictEqual(corner.interval,[94,106]);for(let i=1;i<corner.points.length;i++)assert(corner.points[i].x===corner.points[i-1].x||corner.points[i].y===corner.points[i-1].y);
const prefs=new Map([['trunksketch-defaults',JSON.stringify({showNames:false,lineWidth:3,defaultBoxName:'Controller'})]]),defaultsContext={localStorage:{getItem:k=>prefs.get(k)}};vm.createContext(defaultsContext);vm.runInContext(pick('const originalDefaults=','const data=')+';this.result=savedDefaults()',defaultsContext);assert.strictEqual(defaultsContext.result.showNames,false);assert.strictEqual(defaultsContext.result.defaultBoxName,'Controller');assert.strictEqual(defaultsContext.result.lineWidth,3);assert.strictEqual(defaultsContext.result.loopGap,12);
const tinyParent={id:'tiny',kind:'central',anchors:[{x:100,y:0},{x:0,y:0}]};const tinyLoops=[{id:'a',kind:'loop',trunk:'tiny',anchors:[{x:25,y:0},{x:25.8,y:-15}]},{id:'b',kind:'loop',trunk:'tiny',anchors:[{x:34,y:0},{x:33.3,y:35}]},{id:'c',kind:'loop',trunk:'tiny',anchors:[{x:50,y:0},{x:53.5,y:65}]}];
const tidy=logic.layoutsForTrunk(tinyParent,[tinyParent,...tinyLoops],a=>a,13),intervals=[...tidy.layouts.values()].map(l=>l.interval).sort((a,b)=>a[0]-b[0]);for(let i=1;i<intervals.length;i++)assert(intervals[i][0]>intervals[i-1][1],'Close loop openings stay separate');
const stable=JSON.stringify(tinyLoops);tinyLoops[0].loopGap=4;const custom=logic.drawingFor(tinyLoops[0],[tinyParent,...tinyLoops],a=>a,13);assert(custom.effectiveGap<=4,'Per-loop spacing is respected');delete tinyLoops[0].loopGap;assert.strictEqual(JSON.stringify(tinyLoops),stable,'Rendering keeps saved anchors intact');
const coincident=[...tinyLoops,{...tinyLoops[0],id:'same'}];const coincidentLayouts=logic.layoutsForTrunk(tinyParent,[tinyParent,...coincident],a=>a,13);const openings=[...coincidentLayouts.layouts.values()].map(l=>l.interval).sort((a,b)=>a[0]-b[0]);for(let i=1;i<openings.length;i++)assert(openings[i][0]>=openings[i-1][1]-1e-6,'Coincident takeoffs get separate ports');
const rounded=logic.roundedCommands([{x:0,y:0},{x:20,y:0},{x:20,y:20}],3);assert.strictEqual(rounded.filter(c=>c.type==='C').length,1);assert.deepStrictEqual(rounded[0].p,{x:0,y:0});assert.deepStrictEqual(rounded.at(-1).p,{x:20,y:20});assert(logic.roundedSvgPath([{x:0,y:0},{x:20,y:0},{x:20,y:20}],3).includes('C '));assert(!logic.roundedSvgPath([{x:0,y:0},{x:20,y:0},{x:20,y:20}],0).includes('C '));
const shortCurve=logic.roundedCommands([{x:0,y:0},{x:1,y:0},{x:1,y:1}],12);assert(shortCurve.every(c=>Object.values(c).filter(v=>v&&typeof v==='object').every(p=>p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1)),'Curves stay within tight bends');
const snapPath=[{x:0,y:0},{x:100,y:0},{x:100,y:100}];const caught=logic.snapToPath({x:96,y:3},snapPath,12);assert(caught.corner);assert.deepStrictEqual({x:caught.x,y:caught.y},{x:100,y:0});assert.strictEqual(caught.along,.5);assert(!logic.snapToPath({x:80,y:2},snapPath,12).corner,'Far points remain free on the run');assert(!logic.snapToPath({x:96,y:3},snapPath,0).corner,'Disabling corner capture keeps ordinary run projection');assert(!logic.snapToPath({x:96,y:3},snapPath,12/4).corner,'Screen tolerance adjusts with zoom');
const stepped=[{x:0,y:10},{x:11,y:10},{x:11,y:2},{x:10,y:2},{x:10,y:0}],smoothed=logic.smoothTerminalJogs(stepped,2);assert.deepStrictEqual(smoothed,[{x:0,y:10},{x:10,y:10},{x:10,y:0}]);assert.deepStrictEqual(smoothed[0],stepped[0]);assert.deepStrictEqual(smoothed.at(-1),stepped.at(-1));assert.strictEqual(stepped.length,5,'Join cleanup does not mutate saved points');
const manualJoin=[{x:475.58539043148966,y:811.3198488437193},{x:473.13880631851276,y:811.3198488437193},{x:473.13880631851276,y:810.6164329566963},{x:451.3744228215382,y:810.6164329566963},{x:451.3744228215382,y:929.6325083020595},{x:438.71293685512245,y:929.6325083020595}];const flush=logic.smoothTerminalJogs(manualJoin,2);assert.strictEqual(flush[1].y,manualJoin[0].y,'Manual loop aligns flush to the horizontal trunk');assert.deepStrictEqual(flush[0],manualJoin[0]);assert.deepStrictEqual(flush.at(-1),manualJoin.at(-1));assert.strictEqual(flush.length,4,'Tiny blue-to-red step is removed');
const manualRoute={id:'manual',kind:'loop',manualRouting:true,trunk:'tiny',anchors:[{x:50,y:0},{x:35,y:40}]};const manualLayout=logic.drawingFor(manualRoute,[tinyParent,manualRoute],a=>a,13,1.5);assert(manualLayout.points.length>1,'Manual loops keep their editable route while the join is finished');
const terminalNodes=[{id:'end',kind:'eol',label:'EOL',x:90,y:30}],terminalParent={id:'end-main',kind:'central',anchors:[{x:0,y:0},{x:100,y:0}]},earlierLoop={id:'early',kind:'loop',trunk:'end-main',anchors:[{trunk:'end-main',along:.4,x:40,y:0},{x:40,y:20}]};const terminalResolve=a=>a.node?terminalNodes.find(n=>n.id===a.node):a;
const tail=[{trunk:'end-main',along:.9,x:90,y:0},{node:'end',x:90,y:30}];const terminated=logic.terminateTrunkAtEol(terminalParent,tail,[terminalParent,earlierLoop],terminalNodes,terminalResolve);assert.strictEqual(terminated.removedLength,10,'Unused trunk tail is trimmed even when takeoff is short of end');assert(logic.endsAtEol(terminalParent,terminalNodes));const terminalPath=logic.orthogonal(terminalParent.anchors,terminalResolve);assert.deepStrictEqual(terminalPath.at(-1),{x:90,y:30});assert(!terminalPath.some(p=>p.x===100),'Old endpoint is removed');assert.strictEqual(logic.attachmentStation(earlierLoop.anchors[0],terminalPath),40,'Existing ordinary takeoff stays in place');assert.strictEqual(terminalParent.endName,'EOL');terminalNodes[0].label='EOL-2';assert.strictEqual(logic.trunkEndName(terminalParent,terminalNodes),'EOL-2');
const blockedParent={id:'blocked',kind:'central',anchors:[{x:0,y:0},{x:100,y:0}]},downstream={id:'late',kind:'loop',trunk:'blocked',anchors:[{trunk:'blocked',along:.95},{x:95,y:10}]},unchanged=JSON.stringify(blockedParent);assert.throws(()=>logic.terminateTrunkAtEol(blockedParent,[{trunk:'blocked',along:.9},{node:'end'}],[blockedParent,downstream],terminalNodes,terminalResolve),/after the last ordinary loop/);assert.strictEqual(JSON.stringify(blockedParent),unchanged,'Conflicting termination does not damage an existing drawing');
const migratedParent={id:'migration',kind:'central',anchors:[{x:0,y:0},{x:100,y:0}]},oldEolLoop={id:'old-eol',kind:'loop',trunk:'migration',anchors:[{trunk:'migration',along:.9,x:90,y:0},{node:'end',x:90,y:30}]};const migrated={pages:{1:{nodes:terminalNodes,routes:[migratedParent,oldEolLoop]}}};const upgraded=logic.upgradeEolLoops(migrated);assert.strictEqual(upgraded.converted.length,1);assert.strictEqual(migrated.pages[1].routes.length,1,'Old paired EOL loop is replaced by trunk tail');assert(logic.endsAtEol(migratedParent,terminalNodes));
const start={x:10,y:10},firstLeg=logic.draftStep(start,{x:110,y:60,node:'target'});assert.deepStrictEqual({x:firstLeg.x,y:firstLeg.y},{x:110,y:10});assert(!firstLeg.node,'Off-axis point places only a corner');const secondLeg=logic.draftStep(firstLeg,{x:110,y:60,node:'target'});assert.strictEqual(secondLeg.node,'target');assert.deepStrictEqual(logic.orthogonal([start,firstLeg,secondLeg]),[{x:10,y:10},{x:110,y:10},{x:110,y:60}],'Each tap adds one leg with no extra elbow');const alternate=logic.draftStep(start,{x:110,y:60},true);assert.deepStrictEqual({x:alternate.x,y:alternate.y},{x:10,y:60});
console.log('PASS: one straight leg per tap, explicit turns, point connection on next leg, and alternate axis');
console.log('PASS: EOL single-run termination, leftover-tail trimming, unchanged ordinary loops, conflict protection and old-project conversion');
console.log('PASS: exact reported blue-to-red manual join has no offset step');
console.log('PASS: nearby corner snapping, far/disabled/zoom cases, exact attachment stations, and smooth terminal joins');
console.log('PASS: true rounded corners, square fallback, unchanged endpoints and safe radii for short legs');
console.log('PASS: tiny elbow cleanup, separate close takeoffs, coincident ports, individual spacing and unchanged anchors');
console.log('PASS: widened loop connections, omitted trunk bridges, corner gaps, merged gaps and saved defaults');
console.log('PASS: trunk station, END-to-BOX loop ordering, reorder after move, attached takeoffs, paired orthogonal return paths');
}
run().catch(e=>{console.error(e);process.exitCode=1});
