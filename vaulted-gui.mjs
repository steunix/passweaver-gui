/**
 * Vaulted-gui, a GUI for Vaulted password manager
 *
 * (c) 2023 - Stefano Rivoir <rs4000@gmail.com>
 *
 * @module main
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import Express from 'express'
import compression from 'compression'
import * as Config from './src/config.mjs'
import * as Vaulted from './src/vaulted.mjs'
import session from 'express-session'
import FileStore from 'session-file-store'
import jsonwebtoken from 'jsonwebtoken'

const fileStore = FileStore(session)
export const app = Express()

const cfg = Config.get()

// Express middlewares
app.use(Express.json())
app.use(compression())
app.use(Express.urlencoded({ extended: true }))
app.use(session({
  name: "vaultedgui",
  store: new fileStore({}),
  secret: cfg.session_key_env,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 4 }
}))

// Checks for valid session in pages/ subdir
app.use("/pages", function(req,res,next) {
  if ( !req.session.userid ) {
    res.status(401).redirect("/login?error=You need to login")
    return
  }
  return next()
})

// Use EJS
app.set('view engine', 'ejs');

// Static Middleware
app.use("/public", Express.static('public'))

// Login page
app.get("/login", (req,res)=>{
  var data = {
    error: req.query.error,
    company_name: cfg.company_name
  }
  res.render('login', data)
})

// Logout page
app.get("/logout", (req,res)=>{
  req.session.destroy()

  res.status(200).redirect("/login")
})

// Access page
app.post("/access", async (req,res)=>{
  const resp = await Vaulted.login(req.body.username, req.body.password)

  if ( resp.status!=="success" ) {
    res.status(401).redirect("/login?error="+resp.message)
    return
  }

  // Get user name
  req.session.jwt = resp.data.jwt
  const jwt = jsonwebtoken.decode(req.session.jwt)

  req.session.userid = jwt.user

  const usr = await Vaulted.getUser(req.session, req.session.user)

  req.session.userdescription = usr.data.description
  req.session.email = usr.data.email
  req.session.save()

  res.status(200).redirect("/pages/items")
})

// Items
app.get("/pages/items", async (req,res)=>{
  const tree = await Vaulted.tree(req.session)

  var resp = { tree: tree.data || [] }
  if ( tree.status=="failed" ) {
    resp.error = tree.message
  }

  res.render('items', resp)
})

// Items list
app.get("/pages/itemslist/:folder", async (req,res)=>{
  const list = await Vaulted.itemslist(req.session, req.params.folder)

  res.status(200).send(list)
})

// Folder details
app.get("/pages/folderinfo/:folder", async (req,res)=>{
  const info = await Vaulted.getFolder(req.session, req.params.folder)

  res.status(200).send(info)
})

// New item dialog
app.get("/pages/itemnew", (req,res)=>{
  res.render("itemnew")
})

// Create item
app.post("/pages/itemnew/:folder", async (req,res)=> {
  const resp = await Vaulted.itemCreate(req.session, req.params.folder, req.body)

  res.status(200).send(resp)
})

console.log("Listening on port "+cfg.listen_port)

app.listen(cfg.listen_port)
