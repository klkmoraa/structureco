const CACHE_NAME="structureco-shell-7873c06f45591626";
const SHELL=["./assets/CommandPalette-CRBie2tl.js","./assets/InfluenceLineView-B7j43Rf9.js","./assets/ModelDoctor-BZOpcooU.js","./assets/ModelDoctor-B_s-eftz.css","./assets/Phase2DxfAction-CTC8C-Q0.css","./assets/Phase2DxfAction-C_q6iqDH.js","./assets/Phase2ProjectHub-B9uSPOzx.css","./assets/Phase2ProjectHub-Bkr8lUS2.js","./assets/PortableImportCenter-BdQFnLD-.js","./assets/PwaUpdateNotice-BdP-1mwc.js","./assets/PwaUpdateNotice-Bl8tvzjR.css","./assets/Space3DWorkspace-C63BzSaN.css","./assets/Space3DWorkspace-C8AY0rpZ.js","./assets/StructureGeneratorSurface-DpDfL-KK.js","./assets/WorkspaceShell-BSxhSlFt.css","./assets/WorkspaceShell-BYma6bvD.js","./assets/analysis.worker-DGXEcNhh.js","./assets/arrow-left-84YSX5c3.js","./assets/browser-DEYugRT4.js","./assets/check-TtOjy2VR.js","./assets/chevron-down-DvC6-qr7.js","./assets/controls-CujdgEDN.js","./assets/copy-DYQ6Hb5S.js","./assets/createLucideIcon-Cml3-wEV.js","./assets/defaultProject-BTVa8YJY.js","./assets/es-CEbGEA7n.js","./assets/index--LSKJlBS.js","./assets/index-CgAllxWl.css","./assets/influence.worker-BSqlB4fk.js","./assets/jsx-runtime-CaR_m4Xc.js","./assets/math-B9PrbyNy.js","./assets/migrate-2QiLPlC2.js","./assets/modelDoctorDiagnostics-CJ4Ag_nz.js","./assets/motionFeatures-Ce_xnTHC.js","./assets/pDelta-B062ZheZ.js","./assets/pdf-Dqia0-Ow.js","./assets/pdf.worker-Dg_VPFYK.mjs","./assets/pdf.worker-HAhvYgAe.js","./assets/portable-Bk540HyV.js","./assets/portableExportAnalysis-C71kIQn3.js","./assets/portableFile-D7eBGYhW.js","./assets/projectCommand-B8WxmRfL.js","./assets/projectRepository-oTZrhz6g.js","./assets/reliability-BCrQkPo9.js","./assets/rolldown-runtime-CNC7AqOf.js","./assets/rotate-ccw-Buo9FQbH.js","./assets/scenarios.worker-BT5F1kqK.js","./assets/shield-alert-RwGFML0-.js","./assets/shield-check-BzmKnplT.js","./assets/space3d.worker-BPyTSpGZ.js","./assets/structuralEditing-DUud0KRu.js","./assets/structureGeneration-C7F2QMuE.js","./assets/structureGenerator-BCkNzaMh.css","./assets/structureGenerator-GL3Eje4r.js","./assets/structureGeometry-BSUVrzQK.js","./assets/toolRegistry-BG2FCJb4.js","./assets/triangle-alert-D_MQgJqe.js","./assets/undo-2-D8hkMPuy.js","./assets/usePhase2I18n-JU-2EtCC.js","./assets/workerHandlers-BAeB_554.js","./assets/workspaceCommands-DQp7zB9J.js","./assets/wrench-BqGoelox.js","./favicon.svg","./fonts/ibm-plex-mono-400.woff2","./fonts/ibm-plex-mono-500.woff2","./fonts/ibm-plex-sans-400.woff2","./fonts/ibm-plex-sans-500.woff2","./fonts/ibm-plex-sans-600.woff2","./fonts/ibm-plex-sans-700.woff2","./icons.svg","./index.html","./site.webmanifest"];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(SHELL))));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).then(response=>{
      if(response.ok)event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.put('./index.html',response.clone())));
      return response;
    }).catch(async()=>await caches.match('./index.html',{ignoreVary:true})||await caches.match('./',{ignoreVary:true})));
    return;
  }
  event.respondWith(caches.match(request,{ignoreVary:true}).then(cached=>cached||fetch(request).then(response=>{
    if(response.ok)event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.put(request,response.clone())));
    return response;
  })));
});