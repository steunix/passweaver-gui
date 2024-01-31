function spinnerShow() {
  $("body").append(`
  <div id="spinner" class="v-overlay">
    <div class="v-spinner">
      <div class="spinner-border text-success"></div>
    </div>
  </div>`
  );
}

function spinnerHide() {
  $("#spinner").remove()
}

function loadingShow(el) {
  el.addClass("v-blur")
}

function loadingHide(el) {
  el.removeClass("v-blur")
}

function generatePassword() {
  var resp = $.ajax({
    type: "GET",
    url: "/pages/generatepassword",
    async: false
  })

  return resp.responseJSON.data.password
}

function confirm(title,text,callback) {
  var dialog = bootstrap.Modal.getOrCreateInstance(document.getElementById("confirmdialog"), {})
  $("#confirmdialogtitle").html(title)
  $("#confirmdialogtext").html(text)
  $("#confirmdialogok").off("click").on("click", ()=>{
    dialog.hide()
    callback()
  })
  dialog.show()
}

function ensureVisibile(itm) {
  if ( !itm[0] ) {
    return
  }
  itm[0].scrollIntoView({block:"center"})
  return itm
}

function errorDialog(text) {
  var dialog = bootstrap.Modal.getOrCreateInstance(document.getElementById("errordialog"), {})
  $("#errordialogtext").html(text)
  dialog.show()
}