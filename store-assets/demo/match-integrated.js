if(new URLSearchParams(location.search).has('integrated')){
 document.querySelector('.match-header')?.remove();
 document.body.classList.add('integrated-match');
}
