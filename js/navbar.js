let menuLinks={};

function updateActiveMenu(){

 const marker=170;

 const links=document.getElementById("links").getBoundingClientRect();
 const gameshelf=document.getElementById("gameshelf").getBoundingClientRect();
 const schedule=document.getElementById("schedule").getBoundingClientRect();

 Object.values(menuLinks).forEach(link=>link.classList.remove("active"));

 const nearBottom=
  window.innerHeight+window.scrollY>=
  document.documentElement.scrollHeight-80;

 if(schedule.top<=marker||nearBottom){

  menuLinks.schedule.classList.add("active");

 }else if(gameshelf.top<=marker){

  menuLinks.gameshelf.classList.add("active");

 }else if(links.top<=marker){

  menuLinks.links.classList.add("active");

 }else{

  menuLinks.home.classList.add("active");

 }

}

window.initNavbar=function(){

 menuLinks={
  home:document.querySelector('.menu a[href="#home"]'),
  links:document.querySelector('.menu a[href="#links"]'),
  gameshelf:document.querySelector('.menu a[href="#gameshelf"]'),
  schedule:document.querySelector('.menu a[href="#schedule"]')
 };

 updateActiveMenu();

 window.addEventListener("scroll",updateActiveMenu);

 window.addEventListener("scroll",()=>{

  const y=window.scrollY*0.04;

  document.querySelector(".background").style.transform=
   `translateY(${y}px) scale(1.08)`;

 });

};
