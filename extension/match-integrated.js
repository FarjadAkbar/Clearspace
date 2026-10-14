if(new URLSearchParams(location.search).has('integrated')){
 document.querySelector('.match-header')?.remove();
 document.querySelector('.match-heading')?.remove();
 document.body.classList.add('integrated-match');
 const root=document.querySelector('#ats-root');
 const report=()=>parent.postMessage({type:'clearspace-matcher-height',height:Math.ceil(root.getBoundingClientRect().height)+8},location.origin);
 new ResizeObserver(report).observe(root);
 document.fonts.ready.then(report);
}
