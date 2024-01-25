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