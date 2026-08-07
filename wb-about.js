/* Wildbosses about page */

/* Reveal */
const ro=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('vis');ro.unobserve(e.target);}});},{threshold:.08,rootMargin:'0px 0px -40px 0px'});
document.querySelectorAll('.reveal').forEach(el=>ro.observe(el));

/* Form submit */
function submitForm(){
  const toast=document.getElementById('toast');
  toast.textContent='Enquiry sent! We\'ll reply within 2 hours 🌍';
  toast.classList.add('show');
  setTimeout(()=>toast.classList.remove('show'),4000);
}

