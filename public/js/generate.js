async function passwordGenerate() {
  const resp = await jhFetch("/api/generatepassword")
  if ( !await checkResponse2(resp) ) {
    return
  }

  const body = await resp.json()
  if ( body.status=="success" ) {
    jhValue("#generatedpassword", body.data.password)
  }
}

await passwordGenerate()
jhEvent("#generate", "click",async (ev)=>{
  await passwordGenerate()
})