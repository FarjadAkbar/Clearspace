// Start once, after every planner view and render wrapper is defined.
let plannerBoot;
function bootPlanner(){
 if(plannerBoot)return plannerBoot;
 plannerBoot=(async()=>{
  const [saved]=await Promise.all([Store.get(),loadScrollStats()]);
  state=saved;
  if(new URLSearchParams(location.search).has('settings'))view='settings';
  plannerReady=true;
  render();
  document.dispatchEvent(new Event('clearspace-ready'));
 })().catch(error=>{
  console.error('Clearspace could not start:',error);
  const app=document.querySelector('#app');
  if(app)app.textContent='Clearspace could not load. Please reload the extension and reopen this page.';
 });
 return plannerBoot;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootPlanner,{once:true});
else bootPlanner();
