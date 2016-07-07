console.log('booting')


export function argsToArray(args){
  return Array.prototype.slice.call(args);
}
setTimeout(function () {

  var form = document.forms['alice-controls']
  function showForm () {
    window.formData = new FormData(form);
    formData.forEach((a, b) => {console.log(a, b)})
    console.log(formData)
  }
  form.onsubmit = (oo) => {
    oo.preventDefault();
    showForm()
  }
  window.show = showForm
  var inputs = form.querySelectorAll('input[type="text"]')
  argsToArray(inputs).forEach((i) => {
    console.log(i.value)

  })
  var hidden = form.querySelectorAll('input[type="hidden"]')
  argsToArray(hidden).forEach((i) => {
    console.log(i.value)

  })
}, 1000);
