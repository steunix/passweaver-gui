import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'

const domCache = {
  passwordInput: JH.query('#generatedpassword'),
  noSymPasswordInput: JH.query('#generatedpasswordns'),
  generateButton: JH.query('#generate'),
  noSymGenerateButton: JH.query('#generatens'),
  onetimeCreate: JH.query('#onetime'),
  noSymOnetimeCreate: JH.query('#onetimens'),
  generatedPasswordInput: JH.query('#generatedpassword'),
  noSymGeneratedPasswordInput: JH.query('#generatedpasswordns')
}

async function generatePassword (symbols = true) {
  const passwordInput = symbols ? domCache.passwordInput : domCache.noSymPasswordInput
  JH.value(passwordInput, 'Generating...')
  const url = symbols ? '/api/generatepassword' : '/api/generatepassword?symbols=false'

  const resp = await JH.http(url)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  if (body.status === 'success') {
    JH.value(passwordInput, body.data.password)
  }
}

function tokenGenerate (data) {
  window.location = `/pages/onetimesecret?data=${encodeURIComponent(data)}`
}

// Initial password generation
await generatePassword()
await generatePassword(false)

// Event listeners
JH.event(domCache.generateButton, 'click', async () => {
  await generatePassword()
})

JH.event(domCache.noSymGenerateButton, 'click', async () => {
  await generatePassword(false)
})

JH.event(domCache.onetimeCreate, 'click', () => {
  tokenGenerate(JH.value(domCache.generatedPasswordInput))
})

JH.event(domCache.noSymOnetimeCreate, 'click', () => {
  tokenGenerate(JH.value(domCache.noSymGeneratedPasswordInput))
})
