// Shared by the web iframe and native WebView. Keep check-in text out of HTML.
export function mapDocument() {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link href="https://unpkg.com/maplibre-gl@5.6.1/dist/maplibre-gl.css" rel="stylesheet">
<style>html,body,#map{margin:0;width:100%;height:100%;font-family:system-ui;background:#fbf1ee}button{font:inherit;cursor:pointer}.pin{appearance:none;-webkit-appearance:none;display:block;box-sizing:border-box;width:54px;height:62px;border:0;background:transparent;padding:0;filter:drop-shadow(0 3px 5px #0003)}.pin img{position:absolute;top:0;left:0;display:block;box-sizing:border-box;width:54px;height:54px;object-fit:cover;border:3px solid var(--accent);border-radius:15px;background:var(--surface)}.pin:after{content:"";position:absolute;top:54px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:8px solid var(--accent);pointer-events:none}.cluster{width:48px;height:48px;border:3px solid var(--surface);border-radius:50%;background:var(--accent);color:white;font-weight:700}.map-attribution{position:absolute;bottom:8px;right:8px;z-index:1;max-width:calc(100% - 16px);border-radius:16px;background:var(--surface,#fff);color:#333;font-size:11px;box-shadow:0 1px 4px #0002}.map-attribution summary{float:right;display:block;list-style:none;cursor:pointer;width:32px;height:32px;line-height:32px;text-align:center;font-size:20px}.map-attribution summary::-webkit-details-marker{display:none}.map-attribution span{display:block;padding:8px 36px 8px 10px;line-height:16px}.map-attribution a{color:inherit}.map-attribution summary:focus-visible{outline:2px solid var(--accent);border-radius:50%}#status{position:absolute;inset:0;display:grid;place-items:center;padding:25px;text-align:center;color:#704654;background:#fbf1ee;z-index:2}#status[hidden]{display:none}</style></head>
<body><div id="map" aria-label="Bản đồ kỷ niệm"></div><details id="map-attribution" class="map-attribution"><summary aria-label="Nguồn dữ liệu bản đồ">ⓘ</summary><span><a href="https://www.openmaptiles.org/" target="_blank" rel="noopener noreferrer">© OpenMapTiles</a> · Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a></span></details><div id="status" role="status">Đang mở bản đồ…</div>
<script src="https://unpkg.com/maplibre-gl@5.6.1/dist/maplibre-gl.js" onerror="document.getElementById('status').textContent='Chưa tải được bản đồ. Kiểm tra kết nối rồi mở lại nhé.'"></script>
<script>
const send=data=>{const message=JSON.stringify(data);if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(message);else window.parent.postMessage(message,'*')};
let map,config,ready=false,selection,markers={},requested={},initial=true,lastFocus='';
const placeholder='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144"><rect width="144" height="144" rx="24" fill="#f5e3e8"/><text x="72" y="88" text-anchor="middle" font-size="64" fill="#a04b64">♡</text></svg>');
const status=document.getElementById('status');
const fail=()=>{status.replaceChildren();const wrap=document.createElement('div');wrap.textContent='Chưa tải được bản đồ. Kiểm tra kết nối rồi thử lại nhé.';const retry=document.createElement('button');retry.textContent='Thử lại';retry.style.cssText='display:block;margin:16px auto;padding:10px 20px;border-radius:18px;border:0;background:#fff';retry.onclick=()=>location.reload();wrap.appendChild(retry);status.appendChild(wrap);status.hidden=false};
setTimeout(()=>{if(!ready)fail()},25000);
function theme(){const c=config.colors;document.documentElement.style.setProperty('--accent',c.primary);document.documentElement.style.setProperty('--surface',c.surface);
for(const layer of map.getStyle().layers){const id=layer.id.toLowerCase();try{
if(layer.type==='background')map.setPaintProperty(layer.id,'background-color',c.background);
if(layer.type==='fill')map.setPaintProperty(layer.id,'fill-color',/water/.test(id)?c.lavender:/park|wood|grass|landcover/.test(id)?c.rose:/building/.test(id)?c.line:c.background);
if(layer.type==='line')map.setPaintProperty(layer.id,'line-color',/water/.test(id)?c.lavender:/boundary/.test(id)?c.primary:/tunnel|bridge|road|highway/.test(id)?c.surface:c.line);
if(layer.type==='symbol'){map.setPaintProperty(layer.id,'text-color',c.muted);map.setPaintProperty(layer.id,'text-halo-color',c.surface);if(/poi/.test(id))map.setLayoutProperty(layer.id,'visibility','none')}
}catch{}}
}
function pins(){if(!ready||!map.isSourceLoaded('checkins'))return;const next={};const used=new Set();const positions={};
for(const f of map.querySourceFeatures('checkins')){if(!map.getBounds().contains(f.geometry.coordinates))continue;const p=f.properties;const key=p.cluster?'cluster-'+p.cluster_id:p.id;if(used.has(key))continue;used.add(key);if(!p.cluster&&!p.uri&&(!requested[p.id]||Date.now()-requested[p.id]>10000)){requested[p.id]=Date.now();send({type:'photo',id:p.id})}
let marker=markers[key];if(!marker){const el=document.createElement('button');el.type='button';el.className=p.cluster?'cluster':'pin';
if(p.cluster){el.textContent=p.point_count;el.setAttribute('aria-label',p.point_count+' kỷ niệm, chạm để phóng to');el.onclick=()=>map.getSource('checkins').getClusterExpansionZoom(p.cluster_id).then(zoom=>map.easeTo({center:f.geometry.coordinates,zoom}));}
else{el.setAttribute('aria-label','Xem kỷ niệm '+p.title);const img=document.createElement('img');img.alt=p.title;img.src=p.uri||placeholder;img.onerror=()=>{img.alt='Ảnh kỷ niệm';};el.appendChild(img);el.onclick=e=>{e.stopPropagation();send({type:'open',id:p.id})}}
marker=new maplibregl.Marker({element:el,anchor:p.cluster?'center':'bottom'}).setLngLat(f.geometry.coordinates).addTo(map)}
if(!p.cluster){const pos=f.geometry.coordinates.join(',');const count=positions[pos]||0;positions[pos]=count+1;marker.setOffset([count?Math.ceil(count/2)*60*(count%2?1:-1):0,0]);const img=marker.getElement().querySelector('img');if(img&&img.getAttribute('src')!==(p.uri||placeholder))img.src=p.uri||placeholder;}
marker.setLngLat(f.geometry.coordinates);if(p.cluster){marker.getElement().textContent=p.point_count;marker.getElement().setAttribute('aria-label',p.point_count+' kỷ niệm, chạm để phóng to');marker.getElement().onclick=()=>map.getSource('checkins').getClusterExpansionZoom(p.cluster_id).then(zoom=>map.easeTo({center:f.geometry.coordinates,zoom}));}else marker.getElement().setAttribute('aria-label','Xem kỷ niệm '+p.title);
next[key]=marker;}
for(const key in markers)if(!next[key])markers[key].remove();markers=next;
}
function data(){map.getSource('checkins').setData({type:'FeatureCollection',features:config.items.map(i=>({type:'Feature',geometry:{type:'Point',coordinates:[i.longitude,i.latitude]},properties:{id:i.id,title:i.title,uri:i.uri}}))});}
function update(){if(!ready)return;theme();data();if(selection)selection.remove();if(config.selected){selection=new maplibregl.Marker({color:config.colors.primary,draggable:true}).setLngLat([config.selected.longitude,config.selected.latitude]).addTo(map);selection.on('dragend',()=>{const p=selection.getLngLat();send({type:'pick',latitude:p.lat,longitude:p.lng})});}
if(config.focus&&config.focus.key!==lastFocus){lastFocus=config.focus.key;map.easeTo({center:[config.focus.longitude,config.focus.latitude],zoom:15})}
if(initial){initial=false;if(config.viewport)map.jumpTo(config.viewport);else if(config.items.length){const bounds=new maplibregl.LngLatBounds();config.items.forEach(i=>bounds.extend([i.longitude,i.latitude]));map.fitBounds(bounds,{padding:70,maxZoom:13,duration:0})}}
}
window.receiveMapConfig=next=>{config=next;if(map){update();return}if(!window.maplibregl){fail();return}
try{map=new maplibregl.Map({container:'map',style:'https://tiles.openfreemap.org/styles/positron',center:[106.69,10.78],zoom:5,maxZoom:20,attributionControl:false});map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
new ResizeObserver(()=>map.resize()).observe(document.getElementById('map'));
map.on('load',()=>{map.addSource('checkins',{type:'geojson',data:{type:'FeatureCollection',features:[]},cluster:true,clusterRadius:55,clusterMaxZoom:14});map.addLayer({id:'checkin-hit-source',type:'circle',source:'checkins',paint:{'circle-radius':1,'circle-opacity':0}});ready=true;status.hidden=true;update();map.on('idle',pins);map.on('moveend',()=>{pins();const p=map.getCenter();send({type:'move',viewport:{center:[p.lng,p.lat],zoom:map.getZoom()}})});});
map.on('click',e=>{if(config.picking)send({type:'pick',latitude:e.lngLat.lat,longitude:e.lngLat.lng})});map.on('error',e=>{console.warn('Map resource:',e.error?.message);if(!ready)fail()});
}catch(error){console.warn('Map initialization:',error.message);fail()}};
window.addEventListener('message',event=>{if(event.source!==window.parent)return;try{const v=typeof event.data==='string'?JSON.parse(event.data):event.data;if(v.type==='config')window.receiveMapConfig(v.config)}catch{}});
send({type:'ready'});
</script></body></html>`;
}
