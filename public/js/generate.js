function passwordGenerate() {
  $.get("/api/generatepassword", (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    if ( resp.status=="success" ) {
      $("#generatedpassword").val(resp.data.password)
    }
  })
}

passwordGenerate()
$("#generate").on("click",(ev)=>{
  passwordGenerate()
})