function spinnerShow() {
    $("body").append(`
    <div id="v-spinner" class="v-overlay">
      <div class="v-spinner">
        <div class="spinner-border text-success"></div>
      </div>
    </div>`
    );
}

function spinnerHide() {
    $("#v-spinner").remove()
}